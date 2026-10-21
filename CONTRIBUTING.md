# Contributing to helm-charts

Any contributions are welcome and will be considered.

## Making pull-requests

Ideally here's the flow:

- Make the changes
- Bump chart's version in `Chart.yaml`
- Update `CHANGELOG.md` for the chart
- Run [`helm-docs`](https://github.com/norwoodj/helm-docs)
- Run [`helm schema`](https://github.com/losisin/helm-values-schema-json) in `charts/gotenberg` to regenerate `values.schema.json`
- Run [`helm unittest charts/gotenberg`](https://github.com/helm-unittest/helm-unittest)

CI pins `helm-docs`, `helm schema`, `helm-tool` and `actionlint` in `tools/*/go.mod`. To use the same versions locally, install them with e.g. `go -C tools/helm-docs install github.com/norwoodj/helm-docs/cmd/helm-docs`.

## Tests

`charts/gotenberg/tests/` holds [helm-unittest](https://github.com/helm-unittest/helm-unittest) suites:

- `snapshot_test.yaml` renders the chart with the `ci/` values files and `tests/values/all-flags.yaml`, and compares the output with `tests/__snapshot__/`. When you change rendered output on purpose, run `helm unittest -u charts/gotenberg` and commit the updated snapshot. Its diff in the pull request shows reviewers exactly what changed in the manifests.
- When adding a Gotenberg flag, add a value for it to `tests/values/all-flags.yaml` so the snapshot covers it.
- Other suites test template logic: fallbacks, defaults and conditionals. Add a case there when you add logic beyond a plain value-to-flag mapping.

`schema_test.yaml` checks what `values.schema.json` accepts and rejects.

`test/subchart/` is a parent chart that depends on `charts/gotenberg` and sets Helm `global` values. CI renders it with each of the chart's `ci/` and `tests/values/` files nested under `gotenberg:`, and installs it in the kind clusters, so the chart keeps working as a dependency.

The `openshift` job installs the chart on [MicroShift](https://github.com/microshift-io/microshift) built from OKD, once under the `restricted-v2` SCC and once with a service account allowed the `anyuid` SCC, and checks each pod was admitted under the expected SCC before running `helm test` and the render test.

## Values schema

`values.schema.json` is generated from `values.yaml` by [helm-values-schema-json](https://github.com/losisin/helm-values-schema-json), configured in `charts/gotenberg/.schema.yaml`. Descriptions come from the `# --` comments that `helm-docs` also uses. Types are inferred from the defaults; add a `# @schema` annotation at the end of a key's line when that isn't enough:

- New chart-defined sections get `# @schema additionalProperties: false`, so typos in their keys are rejected. Leave Kubernetes-shaped values (probes, `resources`, `securityContext`, ...) open.
- A value without a default needs its type, e.g. `# @schema type: [string, null]`.
- Deprecated values get `# @schema deprecated` and a description starting with `Deprecated:`.

CI also installs the chart once per values file in `charts/gotenberg/ci/` on each supported Kubernetes version, in kind clusters that enforce the Pod Security `restricted` level (`.github/kind/`), then runs `.github/scripts/render-test.js` against every installed release: it converts the documents in `test/render/` with Chromium and LibreOffice, takes a screenshot, merges, reads and PDF/A-converts the results with the PDF engines, and checks each result contains the documents' text.
