name: Bug Report
description: "Report a general library issue."
body:
  - type: markdown
    attributes:
      value: "Before submitting your report, [please ensure your Laravel version is still supported](https://laravel.com/docs/releases#support-policy)."
  - type: input
    attributes:
      label: Vite Plugin Version
      description: Provide the Vite Plugin version that you are using.
      placeholder: 1.6.1
    validations:
      required: true
  - type: input
    attributes:
      label: Laravel Version
      description: Provide the Laravel version that you are using.
      placeholder: 10.4.1
    validations:
      required: true
  - type: input
    attributes:
      label: Node Version
      description: Provide the Node version that you are using.
      placeholder: 10.1.0
    validations:
      required: true
  - type: input
    attributes:
      label: NPM Version
      description: Provide the NPM version that you are using.
      placeholder: 8.1.4
    validations:
      required: true
  - type: dropdown
    attributes:
      label: Operating System
      description: What operating system are you using? Any OS not listed here is currently not supported.
      options:
        - macOS
        - Windows (WSL)
        - Linux
    validations:
      required: true
  - type: input
    attributes:
      label: OS Version
      description: Provide the operation version
      placeholder: 8.1.4
    validations:
      required: true
  - type: input
    attributes:
      label: Web browser and version
      description: Provide the browser type and version you're using to reproduce the bug.
      placeholder: Google Chrome Version 111.0.5563.146 (Official Build) (arm64)
    validations:
      required: true
  - type: dropdown
    attributes:
      label: Running in Sail?
      description: Please indicate if you're running your app and commands in Sail or a custom Docker setup.
      options:
        - "No"
        - Sail
        - Custom Docker
    validations:
      required: true
  - type: textarea
    attributes:
      label: Description
      description: Provide a detailed description of the issue you are facing.
    validations:
      required: true
  - type: textarea
    attributes:
      label: Steps To Reproduce
      description: Provide detailed steps to reproduce your issue. If necessary, please provide a GitHub repository to demonstrate your issue using `laravel new bug-report --github="--public"`.
    validations:
      required: true
     
