import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight, ChevronRight, PanelTop, Plus, RotateCw, X } from 'lucide-react'
import { PlatformMark } from './Home'
import { platformName } from './types'
import type { Account, AccountTab, Platform } from './types'

const platforms: Platform[] = ['x', 'reddit', 'tumblr', 'facebook']
type TabMenu = { tab: AccountTab; account: Account; left: number; top: number; trigger: HTMLElement }

export function AccountTree({ accounts, tabs, selected, expanded, expandSidebar, openAccount, selectTab, reloadTab, closeTab }: {
  accounts: Account[]
  tabs: AccountTab[]
  selected: string
  expanded: boolean
  expandSidebar: () => void
  openAccount: (account: Account, newTab: boolean) => void
  selectTab: (tab: AccountTab) => void
  reloadTab: (tab: AccountTab) => void
  closeTab: (id: string) => void
}) {
  const [collapsed, setCollapsed] = useState(() => new Set<string>())
  const [menu, setMenu] = useState<TabMenu>()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setMenu(undefined)
    }
    const close = () => setMenu(undefined)
    menuRef.current?.querySelector('button')?.focus({ preventScroll: true })
    window.addEventListener('pointerdown', outside)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', close)
    }
  }, [menu])

  function toggle(key: string, open?: boolean) {
    setCollapsed(previous => {
      const next = new Set(previous)
      if (open ?? next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function showMenu(tab: AccountTab, account: Account, trigger: HTMLElement, x: number, y: number) {
    const rail = trigger.closest('.sidebar')?.getBoundingClientRect()
    setMenu({
      tab, account, trigger,
      left: Math.max((rail?.left ?? 0) + 4, Math.min(x, (rail?.right ?? window.innerWidth) - 156)),
      top: Math.max(4, Math.min(y, window.innerHeight - 112)),
    })
  }

  function showPointerMenu(event: MouseEvent<HTMLDivElement>, tab: AccountTab, account: Account) {
    const trigger = event.currentTarget.querySelector<HTMLButtonElement>('.account-tab-select')
    if (!trigger) return
    event.preventDefault()
    showMenu(tab, account, trigger, event.clientX, event.clientY)
  }

  return <nav className="account-tree" aria-label="Saved accounts">
    {platforms.map(platform => {
      const group = accounts.filter(account => account.platform === platform)
      if (!group.length) return null
      const platformOpen = !collapsed.has(platform)
      return <section key={platform} className="account-platform" data-platform={platform} aria-label={platformName[platform]}>
        <button type="button" className="account-platform-toggle" aria-label={platformName[platform]} title={platformName[platform]}
          aria-expanded={expanded && platformOpen} onClick={() => {
            if (expanded) toggle(platform)
            else { toggle(platform, true); expandSidebar() }
          }}>
          <PlatformMark platform={platform} />
          <span>{platformName[platform]}</span>
          <ChevronRight className="branch-chevron" size={13} />
        </button>
        {expanded && platformOpen && <ul className="platform-accounts">
          {group.map(account => {
            const children = tabs.filter(tab => tab.accountId === account.id)
            const open = !collapsed.has(account.id)
            return <li key={account.id} className="account-branch">
              <div className="account-row">
                <button type="button" className="account-branch-toggle" aria-label={children.length ? account.label : 'Open ' + account.label}
                  aria-expanded={children.length ? open : undefined} title={account.label}
                  onClick={() => {
                    if (children.length) toggle(account.id)
                    else { toggle(account.id, true); openAccount(account, false) }
                  }}>
                  <ChevronRight className="branch-chevron" size={12} />
                  <span>{account.label}</span>
                </button>
                <button type="button" className="account-action" aria-label={'New tab in ' + account.label} title="New tab"
                  onClick={() => { toggle(account.id, true); openAccount(account, true) }}><Plus size={14} strokeWidth={1.5} /></button>
              </div>
              {open && children.length > 0 && <ul className="account-tabs" aria-label={'Tabs in ' + account.label}>
                {children.map((tab, index) => {
                  const title = tab.title || (index === 0 ? 'Home' : 'New tab')
                  return <li key={tab.id}>
                    <div className="account-tab" data-selected={tab.id === selected}
                      onContextMenu={event => showPointerMenu(event, tab, account)}>
                      <button type="button" className="account-tab-select" title={title}
                        aria-label={title + ' in ' + account.label} aria-current={tab.id === selected ? 'page' : undefined}
                        onClick={() => selectTab(tab)}
                        onKeyDown={event => {
                          if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return
                          event.preventDefault()
                          const bounds = event.currentTarget.getBoundingClientRect()
                          showMenu(tab, account, event.currentTarget, bounds.left, bounds.bottom)
                        }}><PanelTop size={13} /><span>{title}</span></button>
                      <button type="button" className="account-action" aria-label={'Close ' + title + ' in ' + account.label}
                        title="Close tab" onClick={() => closeTab(tab.id)}><X size={13} strokeWidth={1.5} /></button>
                    </div>
                  </li>
                })}
              </ul>}
            </li>
          })}
        </ul>}
      </section>
    })}
    {menu && createPortal(
      <div ref={menuRef} role="menu" aria-label={'Tab actions for ' + menu.account.label}
        className="tab-menu" style={{ left: menu.left, top: menu.top }}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            event.preventDefault()
            menu.trigger.focus({ preventScroll: true })
            setMenu(undefined)
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            const items = Array.from(event.currentTarget.querySelectorAll('button'))
            const index = items.findIndex(item => item === document.activeElement)
            items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
          }
        }}>
        <button type="button" role="menuitem" onClick={() => { selectTab(menu.tab); setMenu(undefined); menu.trigger.focus() }}><ArrowUpRight size={14} /> Open tab</button>
        <button type="button" role="menuitem" onClick={() => { reloadTab(menu.tab); setMenu(undefined); menu.trigger.focus() }}><RotateCw size={14} /> Reload tab</button>
        <button type="button" role="menuitem" onClick={() => { closeTab(menu.tab.id); setMenu(undefined) }}><X size={14} /> Close tab</button>
      </div>, document.body)}
  </nav>
}
