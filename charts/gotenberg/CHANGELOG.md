# Changelog

## 1.5.0

- Bump `gotenberg` version `8.5.1` -> `8.7.0`.
- Add values for the following flags (Thanks to Jonas Geiler | [@jonasgeiler](https://github.com/jonasgeiler)):

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
