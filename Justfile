default: check

# Install dependencies and the development vector CLI.
setup:
    bun install
    just install-cli

# Build vector with the embedded starter and install it on PATH.
install-cli:
    go generate ./internal/starter
    GOBIN="${GOBIN:-$(brew --prefix)/bin}" go install ./cmd/vector

# Run the starter's apps in place: every app, or one of web, docs, lab.
up app="":
    cd starter && vector up {{ app }}

# Stop the starter's apps.
down app="":
    cd starter && vector down {{ app }}

# Show the starter's app state.
status:
    cd starter && vector status

# Rebuild the Lab package on change while the starter's lab app runs.
lab-watch:
    bun run --filter @launch-vector/lab dev

# Build the Lab package that the starter's lab app imports.
lab-build:
    bun run --filter @launch-vector/lab build

# Format workspace source.
format:
    bun run format
    go fmt ./...

# Typecheck every package; the lab app needs the built Lab types.
typecheck: lab-build
    bun run typecheck

# Lint every package and vet the CLI.
lint:
    bun run lint
    go vet ./...

# Test the CLI and the Lab harness.
test:
    go test ./...
    bun run --filter @launch-vector/lab test

# Build every package and the CLI.
build:
    bun run build
    go build ./...

# Create a workspace from this checkout, install it, and build it.
smoke: lab-build
    scripts/smoke.sh

# Run non-mutating verification.
check: test typecheck lint build smoke

# Prepare a release commit and tag: just release 0.2.0
release version:
    scripts/release.sh {{ version }}
