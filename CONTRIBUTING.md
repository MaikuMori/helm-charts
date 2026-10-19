# Contributing to helm-charts

Any contributions are welcome and will be considered.

## Making pull-requests

Ideally here's the flow:

- Make the changes
- Bump chart's version in `Chart.yaml`
- Update `CHANGELOG.md` for the chart
- Run [`helm-docs`](https://github.com/norwoodj/helm-docs)
- Run [`helm unittest charts/gotenberg`](https://github.com/helm-unittest/helm-unittest) and add tests under `charts/gotenberg/tests/` for template logic you change

CI installs the chart once per values file in `charts/gotenberg/ci/` on each supported Kubernetes version.
