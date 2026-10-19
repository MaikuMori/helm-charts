#!/usr/bin/env bash
# Prints a Markdown list of pinned test tools with a newer release that is at
# least COOLDOWN_DAYS old. Prints nothing when everything is current.
set -euo pipefail

workflow=.github/workflows/test.yml
cooldown_days=${COOLDOWN_DAYS:-7}
cutoff=$(date -u -d "-${cooldown_days} days" +%s 2>/dev/null || date -u -v-"${cooldown_days}"d +%s)

pinned() {
  local line
  line=$(grep -m1 -E "$1" "$workflow" || true)
  if ! [[ $line =~ $1 ]]; then
    echo "::error::No pinned version matching '$1' in $workflow" >&2
    return 1
  fi
  echo "${BASH_REMATCH[1]}"
}

check() {
  local name=$1 repo=$2 current=$3 release tag published
  [ -n "$current" ] || exit 1
  release=$(gh api "repos/$repo/releases/latest" --jq '[.tag_name, .published_at] | @tsv')
  IFS=$'\t' read -r tag published <<< "$release"
  if [ "${tag#v}" = "${current#v}" ]; then
    return
  fi
  if [ "$(date -u -d "$published" +%s 2>/dev/null || date -u -j -f %Y-%m-%dT%H:%M:%SZ "$published" +%s)" -gt "$cutoff" ]; then
    return
  fi
  echo "- **$name** \`$current\` → [\`$tag\`](https://github.com/$repo/releases/tag/$tag)"
}

check Helm helm/helm "$(pinned 'version: (v[1-9][0-9]*\.[0-9]+\.[0-9]+)$')"
check helm-unittest helm-unittest/helm-unittest "$(pinned 'helm-unittest/releases/download/(v[0-9.]+)/')"
check zizmor zizmorcore/zizmor "$(pinned 'version: ([0-9]+\.[0-9]+\.[0-9]+)$')"
check "kind (update the node images in the matrix too)" kubernetes-sigs/kind "$(pinned 'version: (v0\.[0-9]+\.[0-9]+)$')"
check "Gateway API CRDs" kubernetes-sigs/gateway-api "$(pinned 'gateway-api/releases/download/(v[0-9.]+)/')"
