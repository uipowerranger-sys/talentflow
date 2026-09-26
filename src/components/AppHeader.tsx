import { Link } from 'react-router-dom';
import { t } from '../i18n';
export function AppHeader({ name, onSignOut }:
    { name: string; onSignOut: () => void }) {
    return (
    <header className="topbar">
        <Link className="brand" to="/jobs">
            <span className="brand-mark" />
            <span>Talent<span className="brand-purple">Flow</span></span>
        </Link>
        <nav className="top-nav">
            <Link className="selected" to="/jobs">{t('nav.findJobs')}</Link>
            <a href="#profile">{t('nav.myProfile')}</a>
            <a href="#resources">{t('nav.careerResources')}</a>
        </nav>
        <div className="user-menu">
            <span className="avatar">
                {name.slice(0, 2).toUpperCase()}</span>
            <span className="user-name">{name}</span>
            <button onClick={onSignOut}>{t('nav.signOut')}</button>
        </div>
    </header>
    );
}
