# Contributing to helm-charts

Any contributions are welcome and will be considered.

## Making pull-requests

Ideally here's the flow:

- Make the changes
- Bump chart's version in `Chart.yaml`
- Update `CHANGELOG.md` for the chart
- Run [`helm-docs`](https://github.com/norwoodj/helm-docs)
- Run [`helm unittest charts/gotenberg`](https://github.com/helm-unittest/helm-unittest)

## Tests

`charts/gotenberg/tests/` holds [helm-unittest](https://github.com/helm-unittest/helm-unittest) suites:

- `snapshot_test.yaml` renders the chart with the `ci/` values files and `tests/values/all-flags.yaml`, and compares the output with `tests/__snapshot__/`. When you change rendered output on purpose, run `helm unittest -u charts/gotenberg` and commit the updated snapshot. Its diff in the pull request shows reviewers exactly what changed in the manifests.
- When adding a Gotenberg flag, add a value for it to `tests/values/all-flags.yaml` so the snapshot covers it.
- Other suites test template logic: fallbacks, defaults and conditionals. Add a case there when you add logic beyond a plain value-to-flag mapping.

CI also installs the chart once per values file in `charts/gotenberg/ci/` on each supported Kubernetes version.
