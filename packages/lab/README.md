# @launch-vector/lab

The Design Lab harness for [Launch Vector](https://github.com/imathis/launch-vector)
workspaces: experiment chrome, variant and scenario switching, compare and
presentation modes, and dev-only experiment management.

Workspaces created with `vector new` already include a host app in `apps/lab`
that mounts the Lab:

```ts
import { mountLab } from "@launch-vector/lab"
import { labPlugin } from "@launch-vector/lab/vite"
```

Experiments import `defineExperiment` and types from this package and real UI
from the workspace design system. `vector update` upgrades the harness without
touching experiments.
