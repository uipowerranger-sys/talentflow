import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../i18n';

export function AuthLayout({ children, register = false }: { children: ReactNode; register?: boolean }) {
  return (
  <main className="auth-shell"><aside className="auth-story">
    <Link to="/login" className="brand">
      <span className="brand-mark" />
      <span>Talent<span className="brand-purple">Flow</span>
      </span>
    </Link>
    <div className="story-copy">
      <div className="eyebrow">{t(register ? 'auth.story.registerEyebrow' : 'auth.story.loginEyebrow')}
      </div>
      <h1>{register ?
        <>{t('auth.story.registerTitle')} <span>{t('auth.story.registerHighlight')}
        </span>
        </> :
        <>{t('auth.story.loginTitle')} <span>{t('auth.story.loginHighlight')}</span></>}
      </h1>
      <p>{t('auth.story.copy')}</p>
      <div className="story-proof">
        <div>
          <b>{t(register ? 'auth.story.registerStat1' : 'auth.story.loginStat1')}</b>
          <span>{t(register ? 'auth.story.registerStat1Label' : 'auth.story.loginStat1Label')}
          </span></div>
        <div><b>{t(register ? 'auth.story.registerStat2' : 'auth.story.loginStat2')}</b>
          <span>
            {t(register ? 'auth.story.registerStat2Label' : 'auth.story.loginStat2Label')}
          </span>
        </div>
      </div>
    </div>
    <div className="story-foot">{t('auth.story.footer')}
      <strong>{t('auth.story.footerHighlight')}
      </strong>
    </div>
  </aside>
    <section className="auth-main">
      <div className="auth-switch">{t(register ? 'auth.register.alreadyHaveAccount' : 'auth.login.newHere')}
        <Link to={register ? '/login' : '/register'}>
          {t(register ? 'auth.register.signIn' : 'auth.login.createAccount')}
        </Link>
      </div>
      <div className="auth-content"><Link to="/login" className="brand mobile-brand"><span className="brand-mark" />
        <span>Talent
          <span className="brand-purple">Flow</span>
        </span>
      </Link>
        <div className="form-eyebrow">{t(register ? 'auth.register.eyebrow' : 'auth.login.eyebrow')}</div>
        <h2>{t(register ? 'auth.register.title' : 'auth.login.title')}
        </h2>
        <p className="form-subtitle">{t(register ? 'auth.register.subtitle' : 'auth.login.subtitle')}
        </p>{children}
        <p className="auth-switch-mobile">
          {t(register ? 'auth.register.alreadyHaveAccount' : 'auth.login.newHere')}
          <Link to={register ? '/login' : '/register'}>
            {t(register ? 'auth.register.signIn' : 'auth.login.createAccount')}
          </Link></p></div><Link className="back-jobs" to="/jobs"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> {t('jobs.backLink')}
      </Link>
    </section>
  </main>
  );
}
