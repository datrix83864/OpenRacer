#!/bin/bash
# test_setup.sh — simple tests for setup.sh
# Place this file next to setup.sh and run: bash test_setup.sh

set -uo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
setup="$script_dir/setup.sh"

if [ ! -x "$setup" ]; then
    echo "ERROR: setup.sh not found or not executable at $setup"
    exit 2
fi

tmpbase="$(mktemp -d)"
cleanup() { rm -rf "$tmpbase"; }
trap cleanup EXIT

fakebin="$tmpbase/fakebin"
mkdir -p "$fakebin"
cd "$tmpbase"

fail_count=0

run() {
    # $1 = PATH to use, $2 = expected_exit_code, $3 = expect_string (substring), $4 = test_name
    PATH="$1" bash "$setup" >"$tmpbase/out.txt" 2>&1 || true
    actual_rc=$?
    out="$(cat "$tmpbase/out.txt")"
    echo "---- $4 ----"
    echo "$out"
    if [ "$actual_rc" -ne "$2" ]; then
        echo "RESULT: FAIL (exit code $actual_rc, expected $2)"
        fail_count=$((fail_count+1))
        return
    fi
    if [ -n "${3:-}" ] && ! grep -qF "$3" <(printf "%s" "$out"); then
        echo "RESULT: FAIL (missing expected text: $3)"
        fail_count=$((fail_count+1))
        return
    fi
    echo "RESULT: PASS"
}

# Test 1: node missing -> should exit 1 and mention Node.js is not installed
run "$fakebin" 1 "Node.js is not installed" "node_missing"

# Test 2: node present, npm missing -> exit 1 and mention npm is not installed
cat > "$fakebin/node" <<'EOF'
#!/bin/bash
echo "v16.0.0"
exit 0
EOF
chmod +x "$fakebin/node"

run "$fakebin" 1 "npm is not installed" "npm_missing"

# Test 3: node & npm present, npm install succeeds -> exit 0, assets created, Setup complete
# npm will record calls to a file and return 0
cat > "$fakebin/npm" <<'EOF'
#!/bin/bash
echo "npm called with: $*" >> "$TMPDIR/npm_calls.log" 2>/dev/null || echo "npm called with: $*" >> "$HOME/npm_calls.log"
if [ "$1" = "install" ]; then
    exit 0
fi
exit 0
EOF
chmod +x "$fakebin/npm"

# Run in an isolated working dir so assets are created here
workdir="$tmpbase/work_ok"
mkdir -p "$workdir"
cd "$workdir"
run "$fakebin" 0 "Setup complete" "successful_install"
if [ -d "$workdir/assets" ]; then
    echo "ASSET CHECK: PASS"
else
    echo "ASSET CHECK: FAIL (assets/ not created)"
    fail_count=$((fail_count+1))
fi
cd "$tmpbase"

# Test 4: npm install fails -> script should exit 1 and print Installation failed
cat > "$fakebin/npm" <<'EOF'
#!/bin/bash
# simulate a failing install
if [ "$1" = "install" ]; then
    echo "simulated install failure" >&2
    exit 2
fi
exit 0
EOF
chmod +x "$fakebin/npm"

workdir="$tmpbase/work_fail"
mkdir -p "$workdir"
cd "$workdir"
run "$fakebin" 1 "Installation failed" "failing_install"

# Summary
echo
if [ "$fail_count" -eq 0 ]; then
    echo "ALL TESTS PASSED"
    exit 0
else
    echo "$fail_count test(s) FAILED"
    exit 1
fi