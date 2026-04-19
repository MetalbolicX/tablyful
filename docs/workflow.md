## CLI Control Flow

Detailed medium-level control flow for the CLI including help/version flags, config loading, validation, preflight checks, authentication, command dispatch, execution, retries, signal handling, telemetry, cleanup and exit codes.

```mermaid
flowchart TD
    %% CLI control flow (medium detail) - prefers the project's Mermaid theme
    Start["Start"] --> ParseCLI["Parse CLI & flags"]
    ParseCLI --> CheckHelp{"Help / Version / --help?"}
    CheckHelp -->|'Yes'| ShowHelp["Display help / version & exit"]
    ShowHelp --> Exit0["Exit 0"]

    CheckHelp -->|'No'| LoadConfig["Load configuration (file, env, defaults)"]
    LoadConfig --> ValidateArgs{"Validate args & flags"}
    ValidateArgs -->|'Invalid'| ValidateFail["Print validation errors & usage"]
    ValidateFail --> Exit2["Exit 2"]
    ValidateArgs -->|'Valid'| Preflight["Run preflight checks (env, deps, quotas)"]

    Preflight -->|'Fail'| PreflightFail["Report preflight failure & hints"]
    PreflightFail --> Exit1["Exit 1"]
    Preflight -->|'OK'| AuthNeeded{"Requires authentication?"}
    AuthNeeded -->|'Yes'| Auth["Authenticate: token / credentials / refresh"]
    Auth -->|'Fail'| AuthFail["Auth failed -> prompt / abort"]
    AuthFail --> Exit1
    Auth -->|'OK'| Dispatch["Dispatch command to handler"]
    AuthNeeded -->|'No'| Dispatch

    Dispatch --> CommandType{"Handler type"}
    CommandType -->|'Built-in'| BuiltIn["Built-in handler"]
    CommandType -->|'Plugin/External'| External["Find/Invoke plugin"]
    External --> PluginFound{"Plugin found?"}
    PluginFound -->|'No'| PluginNotFound["Suggest install or update"]
    PluginNotFound --> Exit1
    PluginFound -->|'Yes'| InvokePlugin["Invoke plugin handler"]
    InvokePlugin --> Run
    BuiltIn --> Run

    subgraph Execution
        Run["Run command / main task"] --> RunAsync{"Has async subtasks?"}
        RunAsync -->|'Yes'| Spawn["Spawn background workers / tasks"]
        Spawn --> Monitor["Monitor workers / collect results"]
        Monitor --> RunResult{"Aggregate result"}
        RunAsync -->|'No'| RunResult

        RunResult -->|'Success'| EmitTelemetry["Emit telemetry & metrics"]
        EmitTelemetry --> Cleanup["Cleanup temp files & locks"]
        Cleanup --> Exit0

        RunResult -->|'Transient Error'| Retry{"Retryable?"}
        Retry -->|'Yes'| Backoff["Backoff & retry up to N attempts"]
        Backoff --> Run
        Retry -->|'No'| FatalError["Log error & surface to user"]
        FatalError --> Cleanup --> Exit1
    end

    %% Signal handling (graceful shutdown)
    ParseCLI -->|'SIGINT / SIGTERM'| SignalHandler["Handle interrupt: cancel & cleanup"]
    Run -->|'SIGINT / SIGTERM'| SignalHandler
    Monitor -->|'SIGINT / SIGTERM'| SignalHandler
    SignalHandler --> Cleanup --> Exit1

    %% Exit codes for clarity
    Exit0 -->|'0'| Done["Success"]
    Exit1 -->|'1'| DoneError["Fatal Error"]
    Exit2 -->|'2'| DoneUserError["User Error"]

    %% Notes:
    %% - This diagram intentionally avoids forcing a theme so your project's Mermaid config can style it.
    %% - If you prefer explicit node coloring, see the optional styling snippet below (commented).
```

<!-- Optional styling snippet (uncomment inside the code block to override theme) -->
```text
%% Optional styling (uncomment to override theme)
%% classDef startEnd fill:#2ecc71,stroke:#27ae60,color:#fff;
%% classDef process fill:#e8f4ff,stroke:#1f78ff;
%% classDef decision fill:#fffbe6,stroke:#f39c12;
%% classDef io fill:#f7f7f7,stroke:#7f8c8d;
%% classDef error fill:#ffe6e6,stroke:#c0392b;
%% class Start,Exit0,Exit1,Exit2 startEnd;
%% class ParseCLI,LoadConfig,Preflight,Auth,Dispatch,BuiltIn,External,Run,Spawn,Monitor,Cleanup,EmitTelemetry process;
%% class CheckHelp,ValidateArgs,AuthNeeded,CommandType,RunAsync,Retry,PluginFound decision;
%% class ShowHelp,ValidateFail,PreflightFail,AuthFail,FatalError,PluginNotFound io;
%% class SignalHandler error;
```
