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

## Verifying Charts

Charts are signed with GPG (Helm provenance, key [`pubkey.asc`](pubkey.asc), fingerprint `F29F20C1CBD1FDE9566828E0641F7D67BC03019B`) and with keyless cosign from the release workflow. Each chart's README shows how to verify both, e.g. [Gotenberg](charts/gotenberg/README.md#verifying-the-chart).
