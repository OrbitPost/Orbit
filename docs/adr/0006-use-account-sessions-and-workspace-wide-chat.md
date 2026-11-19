# Use account-specific sessions and workspace-wide chat

New Tab opens a picker for saved accounts and Add account, and every saved account opens its site with its own persistent session. The in-app chat reads the active tab for page-specific requests, every open tab when asked, and the relevant saved accounts for cross-account tasks, opening their tabs as needed. Chat uses the workspace's own actions to work with drafts, the calendar, media, and reports from any tab.

“This page” refers to the center tab when the owner sends the message. When the owner directs the Agent to work in that browser, the Agent can navigate from the selected tab in its saved session. Work directed to another page or account uses the Agent browser, and its live view appears in chat. For example, the owner can keep browsing Reddit in the center while an X task runs in the Agent browser. An explicit request to show a tab in the center opens it there. Publishing uses the platform's supported flow. [Publishing routes](0010-agent-led-publishing.md)

**Take over** pauses the Agent and brings the same page and signed-in session into the center for the owner to continue. **Resume** returns control to the Agent from that page when the owner is ready.

The agent panel starts collapsed and preserves the active conversation when reopened or when switching tabs. **New chat** starts a fresh conversation.
