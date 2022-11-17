# Gotenberg [![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/gotenberg)](https://artifacthub.io/packages/search?repo=gotenberg)

This is a HELM chart for Gotenberg.

Gotenberg provides a developer-friendly API to interact with powerful tools like Chromium and LibreOffice for converting numerous document formats (HTML, Markdown, Word, Excel, etc.) into PDF files, and more!

Upstream links:

- [Homepage](https://gotenberg.dev/)
- [Documentation](https://gotenberg.dev/docs/about)
- [GitHub](https://github.com/gotenberg/gotenberg)

## Installing the Chart

To install the chart with the release name `my-release`:

```bash
# - Add the MaikuMori Helm repository
helm repo add maikumori https://maikumori.github.io/helm-charts

# - Install the gotenberg helm chart
helm install my-release --namespace gotenberg maikumori/gotenberg
```

## Uninstalling the Chart

To uninstall/delete the `my-release` deployment:

```bash
helm delete my-release
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Configuration

The following table lists the configurable parameters of the cert-manager chart and their default values.

> To-Do.
