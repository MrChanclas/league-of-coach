import type { TabKey } from '../../types/dashboard'

type MobileTabBarProps = {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
}

const TABS: { key: TabKey; label: string; tour?: string }[] = [
  { key: 'cuentas', label: 'Cuentas' },
  { key: 'partidas', label: 'Partidas' },
  { key: 'aprendizaje', label: 'Aprendizaje', tour: 'nav-aprendizaje' },
  { key: 'objetivos', label: 'Objetivos', tour: 'nav-objetivos' },
]

// Glifos geométricos propios, sin librería de iconos — ver handoff_loc/05-movil.md.
// El peso de trazo (~1.6px) y el rombo de Aprendizaje son lo único que hay
// que conservar si algún día se reemplazan por una librería real.
function TabGlyph({ tab, active }: { tab: TabKey; active: boolean }) {
  const stroke = active ? 'var(--hf-gold)' : 'var(--hf-muted-4)'
  const fill = stroke

  if (tab === 'cuentas') {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <rect x="4" y="2" width="13" height="10" rx="2" stroke={stroke} strokeWidth="1.6" />
        <rect x="7" y="8" width="13" height="10" rx="2" stroke={stroke} strokeWidth="1.6" fill="rgba(10,12,16,.94)" />
      </svg>
    )
  }
  if (tab === 'partidas') {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <rect x="3" y="4" width="18" height="1.8" rx="0.9" fill={fill} />
        <rect x="3" y="10" width="13" height="1.8" rx="0.9" fill={fill} />
        <rect x="3" y="16" width="16" height="1.8" rx="0.9" fill={fill} />
      </svg>
    )
  }
  if (tab === 'aprendizaje') {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <rect x="4" y="4" width="14" height="14" rx="3" transform="rotate(45 11 11)" stroke={stroke} strokeWidth="1.6" />
        <circle cx="11" cy="11" r="2.5" fill={fill} />
      </svg>
    )
  }
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="9" stroke={stroke} strokeWidth="1.6" />
      <circle cx="11" cy="11" r="4" fill={fill} />
    </svg>
  )
}

export function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <nav className="mobile-tabbar" role="tablist" aria-label="Navegación principal">
      {TABS.map((tab) => {
        const active = tab.key === activeTab
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            data-tour={tab.tour}
            className={active ? 'mobile-tab active' : 'mobile-tab'}
            onClick={() => onTabChange(tab.key)}
          >
            <TabGlyph tab={tab.key} active={active} />
            <span className="mobile-tab-label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
