# Helm charts

Helm charts for software that doesn't have them. Hopefully to be upstreamed.

## Charts

- [Gotenberg](charts/gotenberg/)

## OCI Repositories

The recommended way to install these charts is via OCI and the `helm search hub maikumori` command should list the available charts.

## Non-OCI Repository

If you don't want to use the OCI repositories you can add the `maikumori` repository as follows.

```console
helm repo add maikumori https://maikumori.github.io/helm-charts/
helm repo update
```
