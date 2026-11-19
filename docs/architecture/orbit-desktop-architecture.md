# Orbit desktop architecture

This is the proposed design for the one-owner Windows workspace. The rationale, alternatives, and verification questions are in [ADR 0008](../adr/0008-run-orbit-as-a-local-electron-application.md). The [module and local API design](orbit-module-and-local-api-design.md) describes state ownership, typed commands, and recovery.

## Current project state

Known from the local folder and product records on 2026-11-19. The November 6–15 report and its collection log are the baseline evidence. The Orbit folder contains a scaffold and decision records.

```mermaid
flowchart LR
    Owner["Workspace owner"]
    Sites["Social sites and Discord"]
    Report["Existing weekly report and collection log"]
    Scaffold["Orbit package scaffold, test, and decisions"]

    Owner -->|"Checks account activity"| Sites
    Sites -->|"Post links and reported metrics"| Report
    Report -->|"Baseline and format reference"| Scaffold
```

## C4 context

```mermaid
C4Context
    title Orbit system context
    Person(owner, "Workspace owner", "Uses one Windows PC to manage multiple accounts")
    System(orbit, "Orbit", "Account tabs, drafts, calendar, media, reports, and in-app chat")
    System_Ext(sites, "Social platforms", "Facebook, Reddit, X, and Tumblr")
    System_Ext(discord, "Discord", "Reporting source for membership and invite uses")
    System_Ext(publishers, "Authorized publishing integrations", "Destination-specific API access")
    System_Ext(drive, "Google Drive", "Optional media attachments")
    System_Ext(openai, "ChatGPT / OpenAI", "Model service for the configured agent")

    Rel(owner, orbit, "Switches accounts, queues posts, runs reports")
    Rel(orbit, sites, "Shows signed-in pages and opens prepared drafts")
    Rel(orbit, discord, "Collects available report metrics")
    Rel(orbit, publishers, "Submits due authorized posts and checks outcomes")
    Rel(orbit, drive, "Copies selected media locally")
    Rel(orbit, openai, "Sends selected task context through the agent")
```

## C4 containers

The main process owns the application commands and durable writes. UI commands, agent requests, and scheduled jobs all reach that same boundary.

```mermaid
C4Container
    title Orbit local containers
    Person(owner, "Workspace owner")
    System_Ext(sites, "Social platforms", "Facebook, Reddit, X, and Tumblr")
    System_Ext(providers, "Authorized platform integrations", "Publishing and metric collection")
    System_Ext(openai, "ChatGPT / OpenAI", "Model service")
    System_Boundary(orbit, "Orbit on Windows") {
        Container(ui, "Workspace UI", "React and TypeScript", "Sidebar, Home, Calendar, Analytics, Media, and Agent panel")
        Container(main, "Desktop host", "Electron main and TypeScript", "Owns account views, application commands, scheduler, reports, and provider adapters")
        Container(browser, "Social site views", "Sandboxed Chromium views", "Persistent profile partition for each saved account")
        Container(agent, "Local agent process", "Codex App Server", "Streams chat and requests scoped Orbit actions")
        ContainerDb(db, "Workspace store", "SQLite and local files", "Accounts, drafts, jobs, attempts, reports, and media")
        ContainerDb(private, "Account and credential storage", "Chromium partitions and Windows-backed storage", "Site session data and integration secrets")
    }
    Rel(owner, ui, "Operates workspace and changes tabs")
    Rel(owner, browser, "Signs in and uses social pages")
    Rel(ui, main, "Calls application commands and subscribes to state")
    Rel(main, browser, "Opens a view with the selected account partition")
    Rel(browser, sites, "Loads site pages in that partition")
    Rel(browser, private, "Persists site session data")
    Rel(main, private, "Uses separately stored integration credentials")
    Rel(main, db, "Reads and commits workspace records")
    Rel(main, providers, "Publishes or verifies and reads permitted metrics")
    Rel(main, agent, "Starts on demand and streams local JSON-RPC")
    Rel(agent, main, "Requests allowed actions through the host")
    Rel(agent, openai, "Runs chat turns with selected context")
```

## Scheduled publishing and recovery

This sequence covers a destination with an authorized integration. The prepared draft path opens the site for the owner to finish posting.

```mermaid
sequenceDiagram
    actor Owner
    participant Entry as Calendar or agent
    participant App as Orbit application commands and scheduler
    participant DB as Local store
    participant Provider as Authorized publishing provider

    Owner->>Entry: Queue a draft for an exact account, destination, and time
    Entry->>App: Schedule post
    App->>DB: Commit captured content and schedule after media is available
    DB-->>App: Scheduled post ID
    App-->>Entry: Show scheduled post in Bangkok time

    alt Publish time passed while Orbit could not run
        App->>DB: Mark missed post Overdue on startup or resume
        App-->>Entry: Offer Publish now or Reschedule
    else Due while active, or Owner selects Publish now
        App->>DB: Claim the post and record an attempt
        App->>Provider: Submit the captured content
        alt Provider confirms publication
            Provider-->>App: Verified ID or link
            App->>DB: Save publication and mark Published
        else Provider returns a definite rejection
            Provider-->>App: Confirmed failure
            App->>DB: Save the failure for this destination
        else Timeout or restart with a pending attempt
            App->>Provider: Check for a matching publication when supported
            alt Publication is verified
                Provider-->>App: Verified ID or link
                App->>DB: Save publication and mark Published
            else Outcome remains unclear
                App->>DB: Set Verify publication
                App-->>Entry: Show the destination that needs review
            end
        end
    end
```

## On-demand report

```mermaid
sequenceDiagram
    actor Owner
    participant Entry as Analytics or agent
    participant Collector as Report collection
    participant Source as Account or Discord source
    participant Store as Local report and observation store

    Owner->>Entry: Run weekly report
    Entry->>Collector: Start report with selected scopes
    Collector->>Store: Load the previous verified observations
    Collector->>Source: Request current metrics
    alt Metrics verified
        Source-->>Collector: Scoped figures and evidence
        Collector->>Store: Save new verified observations
    else Sign-in needed
        Collector-->>Entry: Show Reconnect and Copy link
        Note over Collector,Source: Continue checking other sources while this source waits
        alt Owner clicks or copies within five minutes
            Owner->>Entry: Start reconnect
            Collector->>Source: Wait up to five more minutes and refresh
            Source-->>Collector: Verified figures or reconnect still pending
        else No action within five minutes
            Collector->>Store: Select the last verified figures for this source
        end
        Note over Collector,Store: Use the new observation if refreshed or carry the previous figure and date
    end
    Collector->>Store: Save the report with the selected observations
    Store-->>Entry: Publish saved report and refresh Home totals and trends
```

## Deployment

```mermaid
flowchart LR
    subgraph PC["Owner's Windows PC"]
        subgraph Launch["Orbit runs on demand"]
            UI["Orbit renderer"]
            Main["Electron main and scheduler"]
            Views["Account site views"]
            Agent["Optional Codex App Server child"]
        end
        Data[("Orbit data directory: SQLite, media, and profile partitions")]
        Secrets[("Windows-backed secret storage")]
        UI <-->|"Restricted IPC"| Main
        Main -->|"Creates and selects views"| Views
        Main <-->|"stdio and scoped actions"| Agent
        Main --> Data
        Main --> Secrets
        Views -->|"Profile storage"| Data
    end
    Sites["Social sites"]
    APIs["Authorized APIs, Discord, and Drive"]
    Model["Configured model service"]
    Views -->|"HTTPS"| Sites
    Main -->|"HTTPS when requested or due"| APIs
    Agent -->|"HTTPS during agent use"| Model
```

When Orbit exits, its scheduler also exits. SQLite records, media, and account profile data remain on disk. The app opens local tools without an agent connection. Live site access, provider calls, and cloud chat need a network connection.

## Logical data model

The account and publishing destination are independent identities. Their join records the paired target for a post. A report can refer to an earlier verified observation when a source is unavailable. That preserves the original date and prevents a carried-forward value from becoming a new chart point.

```mermaid
erDiagram
    ACCOUNT ||--o{ ACCOUNT_DESTINATION : can_publish_to
    DESTINATION ||--o{ ACCOUNT_DESTINATION : identifies
    ACCOUNT_DESTINATION ||--o{ SCHEDULED_POST : targets
    DRAFT o|--o{ SCHEDULED_POST : supplies
    DRAFT ||--o{ DRAFT_MEDIA : contains
    MEDIA ||--o{ DRAFT_MEDIA : attaches
    SCHEDULED_POST ||--o{ SCHEDULED_MEDIA : captures
    MEDIA ||--o{ SCHEDULED_MEDIA : resolves_to
    SCHEDULED_POST ||--o{ PUBLISH_ATTEMPT : records
    SCHEDULED_POST o|--o| PUBLICATION : resulted_in
    ACCOUNT_DESTINATION ||--o{ PUBLICATION : appeared_at
    REPORT ||--o{ REPORT_METRIC : includes
    OBSERVATION o|--o{ REPORT_METRIC : supports
    METRIC_SCOPE ||--o{ OBSERVATION : defines
    METRIC_SCOPE ||--o{ REPORT_METRIC : identifies
    CHAT ||--o{ CHAT_MESSAGE : contains

    ACCOUNT {
        string id PK
        string platform
        string display_handle
        string session_partition_key
    }
    DESTINATION {
        string id PK
        string platform
        string external_destination_id
        string destination_type
    }
    ACCOUNT_DESTINATION {
        string id PK
        string account_id FK
        string destination_id FK
    }
    DRAFT {
        string id PK
        string caption
    }
    MEDIA {
        string id PK
        string kind
        string local_file_ref
        string source_ref
    }
    SCHEDULED_MEDIA {
        string scheduled_post_id FK
        string media_id FK
        string captured_file_ref
    }
    SCHEDULED_POST {
        string id PK
        string account_destination_id FK
        string draft_id FK
        datetime due_at_utc
        string caption_snapshot
        string title_snapshot
        string delivery_mode
        string status
    }
    PUBLISH_ATTEMPT {
        string id PK
        string scheduled_post_id FK
        string provider
        string outcome
        datetime started_at
    }
    PUBLICATION {
        string id PK
        string scheduled_post_id FK
        string account_destination_id FK
        string external_post_ref
        datetime published_at
    }
    REPORT {
        string id PK
        datetime period_start
        datetime period_end
        datetime saved_at
    }
    METRIC_SCOPE {
        string id PK
        string source_identity
        string metric_key
        string unit
        string coverage
    }
    OBSERVATION {
        string id PK
        string scope_id FK
        string evidence_ref
        float measured_value
        string measurement_period
        datetime verified_at
    }
    REPORT_METRIC {
        string report_id FK
        string observation_id FK
        string scope_id FK
        string availability
    }
    CHAT {
        string id PK
        string provider_thread_ref
    }
```

The ERD describes relationships and durable state. Table shape and indexes are implementation choices. A report entry can represent a missing value without an observation. A verified externally published post can appear on the calendar without a scheduled job when its destination, link, and publish time are known.
