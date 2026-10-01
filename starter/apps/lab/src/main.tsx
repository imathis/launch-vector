import { mountLab } from "@launch-vector/lab"

import { experiments } from "./experiment-registry"
import { labConfig } from "./lab-config"
import "./lab.css"

mountLab({
  root: document.getElementById("root")!,
  config: labConfig,
  experiments,
  title: "Vector Lab",
})
