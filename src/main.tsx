import "./instrument"
import * as Sentry from "@sentry/react"
import ReactDOM from "react-dom/client"
import App from "./app/App"
import "./styles/globals.css"
import "./lib/supabaseClient"

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Missing root element")
}

ReactDOM.createRoot(rootElement, {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler()
}).render(<App />)
