// Package selfupdate replaces the running vector binary with the latest
// GitHub release, and caches a daily "update available" check.
package selfupdate

import (
	"archive/tar"
	"bufio"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
)

const (
	DefaultRepo = "imathis/launch-vector"
	DefaultAPI  = "https://api.github.com"
	binaryName  = "vector"
)

type Client struct {
	API   string
	Repo  string
	Token string
	HTTP  *http.Client
}

// NewClient uses GITHUB_TOKEN, GH_TOKEN, or the GitHub CLI login when present,
// so private releases work without extra setup.
func NewClient() Client {
	return Client{API: DefaultAPI, Repo: DefaultRepo, Token: token(), HTTP: &http.Client{Timeout: 60 * time.Second}}
}

type Release struct {
	Tag    string  `json:"tag_name"`
	Assets []Asset `json:"assets"`
}

type Asset struct {
	Name        string `json:"name"`
	URL         string `json:"url"`
	DownloadURL string `json:"browser_download_url"`
}

func (r Release) Version() string {
	return strings.TrimPrefix(r.Tag, "v")
}

func (r Release) Asset(name string) (Asset, bool) {
	for _, asset := range r.Assets {
		if asset.Name == name {
			return asset, true
		}
	}
	return Asset{}, false
}

func (c Client) Latest(ctx context.Context) (Release, error) {
	url := fmt.Sprintf("%s/repos/%s/releases/latest", strings.TrimRight(c.API, "/"), c.Repo)
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return Release{}, err
	}
	request.Header.Set("Accept", "application/vnd.github+json")
	c.authorize(request)
	response, err := c.httpClient().Do(request)
	if err != nil {
		return Release{}, err
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusNotFound {
		return Release{}, fmt.Errorf("no releases found for %s (private repositories need GITHUB_TOKEN or `gh auth login`)", c.Repo)
	}
	if response.StatusCode != http.StatusOK {
		return Release{}, fmt.Errorf("fetch latest release: %s", response.Status)
	}
	var release Release
	if err := json.NewDecoder(response.Body).Decode(&release); err != nil {
		return Release{}, err
	}
	return release, nil
}

func (c Client) Download(ctx context.Context, asset Asset) ([]byte, error) {
	url := asset.DownloadURL
	if c.Token != "" && asset.URL != "" {
		// The API URL serves private assets; it redirects to storage that
		// rejects the Authorization header, which Go drops across hosts.
		url = asset.URL
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Accept", "application/octet-stream")
	c.authorize(request)
	response, err := c.httpClient().Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("download %s: %s", asset.Name, response.Status)
	}
	return io.ReadAll(response.Body)
}

// AssetName is the release archive for a platform, as GoReleaser names it.
func AssetName(goos, goarch string) string {
	return fmt.Sprintf("vector_%s_%s.tar.gz", goos, goarch)
}

// Apply downloads the release for this platform, verifies its checksum, and
// atomically replaces the executable at target.
func (c Client) Apply(ctx context.Context, release Release, target string) error {
	name := AssetName(runtime.GOOS, runtime.GOARCH)
	asset, ok := release.Asset(name)
	if !ok {
		return fmt.Errorf("release %s has no %s", release.Tag, name)
	}
	archive, err := c.Download(ctx, asset)
	if err != nil {
		return err
	}
	if sums, ok := release.Asset("checksums.txt"); ok {
		listing, err := c.Download(ctx, sums)
		if err != nil {
			return err
		}
		if err := verifyChecksum(listing, name, archive); err != nil {
			return err
		}
	} else {
		return fmt.Errorf("release %s has no checksums.txt", release.Tag)
	}
	binary, err := extractBinary(archive)
	if err != nil {
		return err
	}
	return replaceExecutable(target, binary)
}

func verifyChecksum(listing []byte, name string, data []byte) error {
	scanner := bufio.NewScanner(bytes.NewReader(listing))
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) == 2 && fields[1] == name {
			sum := sha256.Sum256(data)
			if hex.EncodeToString(sum[:]) != fields[0] {
				return fmt.Errorf("checksum mismatch for %s", name)
			}
			return nil
		}
	}
	return fmt.Errorf("checksums.txt does not list %s", name)
}

func extractBinary(archive []byte) ([]byte, error) {
	compressed, err := gzip.NewReader(bytes.NewReader(archive))
	if err != nil {
		return nil, err
	}
	defer compressed.Close()
	reader := tar.NewReader(compressed)
	for {
		header, err := reader.Next()
		if errors.Is(err, io.EOF) {
			return nil, fmt.Errorf("archive has no %s binary", binaryName)
		}
		if err != nil {
			return nil, err
		}
		if header.Typeflag == tar.TypeReg && filepath.Base(header.Name) == binaryName {
			return io.ReadAll(reader)
		}
	}
}

func replaceExecutable(target string, binary []byte) error {
	resolved, err := filepath.EvalSymlinks(target)
	if err != nil {
		return err
	}
	if strings.Contains(resolved, "/Cellar/") {
		return errors.New("vector is managed by Homebrew; run: brew upgrade vector")
	}
	dir := filepath.Dir(resolved)
	temp, err := os.CreateTemp(dir, ".vector-update-*")
	if err != nil {
		return fmt.Errorf("cannot write to %s; reinstall vector somewhere writable or rerun with permission: %w", dir, err)
	}
	defer os.Remove(temp.Name())
	if _, err := temp.Write(binary); err != nil {
		temp.Close()
		return err
	}
	if err := temp.Close(); err != nil {
		return err
	}
	if err := os.Chmod(temp.Name(), 0o755); err != nil {
		return err
	}
	return os.Rename(temp.Name(), resolved)
}

// Newer reports whether version a is greater than b. Development builds are
// never newer and never older than a release.
func Newer(a, b string) bool {
	left, okA := parse(a)
	right, okB := parse(b)
	if !okA || !okB {
		return false
	}
	for i := range left {
		if left[i] != right[i] {
			return left[i] > right[i]
		}
	}
	return false
}

func parse(version string) ([3]int, bool) {
	var parts [3]int
	version = strings.TrimPrefix(version, "v")
	version, _, _ = strings.Cut(version, "-")
	fields := strings.Split(version, ".")
	if len(fields) != 3 {
		return parts, false
	}
	for i, field := range fields {
		value, err := strconv.Atoi(field)
		if err != nil || value < 0 {
			return parts, false
		}
		parts[i] = value
	}
	return parts, true
}

// IsRelease reports whether a version string names a published release.
func IsRelease(version string) bool {
	_, ok := parse(version)
	return ok
}

func (c Client) authorize(request *http.Request) {
	if c.Token != "" {
		request.Header.Set("Authorization", "Bearer "+c.Token)
	}
}

func (c Client) httpClient() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return http.DefaultClient
}

func token() string {
	for _, key := range []string{"GITHUB_TOKEN", "GH_TOKEN"} {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return value
		}
	}
	if _, err := exec.LookPath("gh"); err != nil {
		return ""
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	output, err := exec.CommandContext(ctx, "gh", "auth", "token").Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(output))
}
