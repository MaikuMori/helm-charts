# Changelog

## 1.16.0

- Bump `gotenberg` version `8.25.1` -> `8.26.0`.
- Add support for `--prometheus-metrics-path` flag to set the metrics endpoint path.
- Add experimental Gateway API `HTTPRoute` support (`gateway.enabled`).
- Add `VerticalPodAutoscaler` support (`vpa.create`).
- (CI) Add scheduled workflow to automatically check for new Gotenberg Docker image releases.
- (CI) Update Kubernetes test matrix to v1.35.0, v1.34.3, v1.33.7, v1.32.11, v1.31.14. Update KinD to v0.31.0.

## 1.15.1

- Re-release to fix release assets upload.

## 1.15.0

- Add `initContainers` support for running initialization containers ([@teknatha136](https://github.com/teknatha136)).

## 1.14.0

- Bump `gotenberg` version `8.23.2` -> `8.25.1`.
- Mark `chromium.incognito` flag as deprecated (deprecated in Gotenberg 8.25.0, value is ignored).
- Add support for new PDF Engines flags:
  - `--pdfengines-split-engines` - Set PDF engines for split feature
  - `--pdfengines-flatten-engines` - Set PDF engines for flatten feature
  - `--pdfengines-encrypt-engines` - Set PDF engines for password protection
  - `--pdfengines-embed-engines` - Set PDF engines for file embedding
- Add support for additional configuration flags:
  - `--api-body-limit` - Set request body limit for multipart/form-data
  - `--api-enable-debug-route` - Enable debug endpoint
  - `--api-start-timeout` - Set API startup timeout
  - `--webhook-enable-sync-mode` - Enable synchronous webhook mode
  - `--log-enable-gcp-severity` - Enable GCP severity field mapping
  - `--gotenberg-hide-banner` - Hide startup banner
- Add ability to set `labels` on ingress resource ([@Vovcharaa](https://github.com/Vovcharaa)).
- Add changelog annotations to Chart.yaml for Artifact Hub.
- Fix `HOME` environment variable conflict when set in `extraEnv` - user's explicit setting now takes precedence over automatic behavior.
- (CI) Update GitHub Actions matrix to test against Kubernetes v1.33.1, v1.32.5, v1.31.9, and v1.30.13.

## 1.13.0

- Bump `gotenberg` version `8.19.0` -> `8.23.2`.
- Add `startupProbe` support for deployment.
- Add `existingSecret` option to use an existing secret for basic auth credentials.
- Auto set `HOME` environment variable if `runAsUser` is not the default one.
- Fix issue with `volumes` and TLS secret configuration.
- Minor output rendering fix in HPA template.

## 1.12.0

- Bump `gotenberg` version `8.15.3` -> `8.19.0`.
- Add support for `--log-enable-gcp-fields` flag for improved log field mapping for Cloud Run
- Add support for selecting PDF engines per feature with the following flags:
  - `--pdfengines-merge-engines`
  - `--pdfengines-convert-engines`
  - `--pdfengines-read-metadata-engines`
  - `--pdfengines-write-metadata-engines`
- (CI) Update kind to `v0.27.0` and test against recent K8S versions.

## 1.11.0

- Add possibility to customize `livenessProbe` and `readinessProbe` for deployment ([@v-starodubov](https://github.com/v-starodubov))

## 1.10.0

- Add ability to set `extraMetrics` for HPA ([@anthosz](https://github.com/anthosz))
- Bump `gotenberg` version `8.14.1` -> `8.15.3` ([@anthosz](https://github.com/anthosz))

## 1.9.1

- Fixing 'Additional property enabled is not allowed' when using gotenberg in helm dependency (Thanks to Anthony | [@anthosz](https://github.com/anthosz))
- Bump `gotenberg` version `8.12.0` -> `8.14.1`.
- Publish the chart to OCI registry.

## 1.9.0

- Add ability to create and configure `networkPolicy` (Thanks to Anthony | [@anthosz](https://github.com/anthosz))
- Add [SECURITY.md](../../SECURITY.md).
- Add `testPodAnnotations` (Thanks to Anthony | [@anthosz](https://github.com/anthosz))

## 1.8.0

- Bump `gotenberg` version `8.9.11` -> `8.12.0`.
- Add Helm schema file.
- Update K8S to test against recent K8S versions.
- Add chart signing to CI.

## 1.7.0

- Add ability to customize HorizontalPodAutoscaler behavior (Thanks to Anthony | [@anthosz](https://github.com/anthosz))
- Fix documentation links (Thanks to m² | [@mmoscher](https://github.com/mmoscher))
- Bump `gotenberg` version `8.9.0` -> `8.11.0`.
- Add ability to create `ServiceMonitor` (Thanks to Nazar Vovk | [@Vovcharaa](https://github.com/Vovcharaa))
- Add `allowPrivilegeEscalation: false` to default `securityContext`.
- Add support for the following flags:

  - `--api-download-from-allow-list`
  - `--api-download-from-deny-list`
  - `--api-download-from-max-retry`
  - `--api-disable-download-from`

## 1.6.0

- Bump `gotenberg` version `8.8.1` -> `8.9.0`.
- Add support for `extraEnv` annotations to provide extra environment variables to `gotenberg` container.

## 1.5.1

- Bump `gotenberg` version `8.7.0` -> `8.8.1`.
- Fix [#39](https://github.com/MaikuMori/helm-charts/issues/39) (Thanks to Šimon Woidig | [@SimonWoidig](https://github.com/SimonWoidig))

## 1.5.0

- Bump `gotenberg` version `8.5.1` -> `8.7.0`.
- Add support for the following flags (Thanks to Jonas Geiler | [@jonasgeiler](https://github.com/jonasgeiler)):

  - `--api-tls-cert-file`
  - `--api-tls-key-file`

## 1.4.0

- Add ability to create and configure `PodDisruptionBudget` (Thanks to Aurel Canciu | [@relu](https://github.com/relu))
- Add ability to configure Deployment `topologySpreadConstraints` (Thanks to Aurel Canciu | [@relu](https://github.com/relu))
- Add ability to override Deployment `progressDeadlineSeconds` (Thanks to Aurel Canciu | [@relu](https://github.com/relu))
- Add ability to configure Deployment `strategy` (Thanks to Aurel Canciu | [@relu](https://github.com/relu))
- Add ability to set Service `annotations` (Thanks to Aurel Canciu | [@relu](https://github.com/relu))

## 1.3.0

- Add `securityContext` compatibility with OpenShift platform. (Thanks to Jonas Geiler | [@jonasgeiler](https://github.com/jonasgeiler))
- Bump `gotenberg` version `8.5.0` -> `8.5.1`.

## 1.2.0

- Bump `gotenberg` version `8.1.0` -> `8.5.0`.
- Add new options:

  - `enableBasicAuth`
  - `basicAuthUsername`
  - `basicAuthPassword`

## 1.1.0

- Bump `gotenberg` version `8.0.2` -> `8.1.0`.

- Add new flags:

  - `--chromium-max-queue-size`
  - `--libreoffice-max-queue-size`

## 1.0.1

- Fix typo in `.Values.prometheus.namespace`. (Thanks to Szczepan Rędzioch | [@redzioch](https://github.com/redzioch))
- Bump `gotenberg` version `8.0.1` -> `8.0.2`.

## 1.0.0

- Bump `gotenberg` version `7.10.1` -> `8.0.1`.
- Update configuration options according to upstream changes:
  - Remove `chromium.failedStartsThreshold`.
  - Remove `libreOffice.unoListenerStartTimeout`.
  - Remove `libreOffice.unoListenerRestartThreshold`.
  - Add `chromium.clearCache`.
  - Add `chromium.clearCookies`.
- CI: Fix warning about missing `GITHUB_TOKEN` when setting up Helm.

## 0.7.0

- Bump `gotenberg` version `7.9.2` -> `7.10.1`.
- Add values for the following flags:

  - `--chromium-restart-after`
  - `--chromium-auto-start`
  - `--chromium-start-timeout`
  - `--libreoffice-restart-after`
  - `--libreoffice-auto-start`
  - `--libreoffice-start-timeout`

## 0.6.0

- Add `volumes` and `volumeMounts`. (Thanks to [@pschumacher](https://github.com/pschumacher))

## 0.5.1

- Bump `gotenberg` version `7.9.1` -> `7.9.2`.

## 0.5.0

- Fix [#15](https://github.com/MaikuMori/helm-charts/issues/15) - `HorizontalPodAutoscaler` API version is now `autoscaling/v2` (Thanks to [@tweiss-mdm](https://github.com/tweiss-mdm)).
- Bump `gotenberg` version `7.8.3` -> `7.9.1`.
- Add `logging.fieldsPrefix` value (`--log-fields-prefix`).
- CI: Test install chart on multiple Kubernetes versions (v1.27.3, v1.26.6, v1.25.11, v1.24.15, v1.23.17).
- CI: Test chart upgrades.
- CI: Generate and test as many resources from the chart as possible.

## 0.4.3

- Add `chromium.failedStartsThreshold` value.
- Bump `gotenberg` version `7.8.2` -> `7.8.3`.

## 0.4.2

- Bump `gotenberg` version `7.8.1` -> `7.8.2`.

## 0.4.1

- Bump `gotenberg` version `7.8.0` -> `7.8.1`.

## 0.4.0

- Add `Ingress` resource.

## 0.3.1

- Bump `gotenberg` version `7.7.2` -> `7.8.0`.

## 0.3.0

- Add `podLabels`. (Thanks to Pascal M | [@bagl3y](https://github.com/bagl3y))

## 0.2.2

- Fix `terminationGracePeriodSeconds` set in the wrong place. (Thanks to Szczepan Rędzioch | [@redzioch](https://github.com/redzioch))

## 0.2.1

- Bump app version to `7.2.2`.

## 0.2.0

- Add all documented cli flags as values.

## 0.1.1

- Add README, LICENSE and extra metadata.

## 0.1.0

- Initial release.
