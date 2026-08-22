default: up

# Install system tools and workspace dependencies.
setup:
    @command -v brew >/dev/null || { echo "Homebrew is required: https://brew.sh" >&2; exit 1; }
    @command -v bun >/dev/null || brew install oven-sh/bun/bun
    @command -v node >/dev/null || brew install node
    @command -v go >/dev/null || brew install go
    @command -v process-compose >/dev/null || brew install f1bonacc1/tap/process-compose
    @command -v portless >/dev/null || npm install --global portless@latest
    @mkdir -p "${HOME}/.config/process-compose"
    bun install
    GOBIN="$(brew --prefix)/bin" go install ./cmd/vector

# Start every app, or one of: demo, docs, lab.
up app="":
    @bun tooling/services.ts up "{{ app }}"

# Stop every app, or one of: demo, docs, lab.
down app="":
    @bun tooling/services.ts down "{{ app }}"

# Show app process state.
status:
    @bun tooling/services.ts status

# Follow logs for every app, or one of: demo, docs, lab.
logs app="":
    @bun tooling/services.ts logs "{{ app }}"

# Open the interactive process dashboard.
attach:
    @bun tooling/services.ts attach

# Install JavaScript dependencies only.
install:
    bun install

# Format workspace source.
format:
    bun run format
    go fmt ./...

# Typecheck workspace source.
typecheck:
    bun run typecheck

# Lint workspace source.
lint:
    bun run lint

# Build every workspace.
build:
    bun run build
    go build ./...

# Test and vet the Vector CLI.
vector-check:
    go test ./...
    go vet ./...

# Install the current Vector CLI build.
vector-install:
    GOBIN="$(brew --prefix)/bin" go install ./cmd/vector

# Run non-mutating verification.
check: typecheck lint build vector-check
