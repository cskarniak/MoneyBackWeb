import Image from 'next/image';
import { CrudLayoutShell } from '@/components/layout/CrudLayoutShell';
import { HomeAccountsPanel } from '@/components/home/HomeAccountsPanel';
import styles from './page.module.css';

const HIGHLIGHTS = [
  'Suivre les comptes et les échéances',
  'Ventiler les opérations par enveloppe',
  'Analyse vos comptes avec les outils statistiques intégrés',
];

export default function Home() {
  return (
    <CrudLayoutShell>
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.copy}>
            <p className={styles.kicker}>Accueil MoneyBack Web</p>
            <h1>Piloter ses comptes grâce à une gestion par enveloppes virtuelles et des statistiques en temps réel.</h1>
            <p className={styles.description}>
              Utilise le menu du haut pour naviguer entre les opérations, les référentiels, les imports,
              les outils et les statistiques.
            </p>

            <div className={styles.highlights}>
              {HIGHLIGHTS.map(item => (
                <div key={item} className={styles.highlight}>
                  <span className={styles.dot} />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <HomeAccountsPanel />
          </div>

          <div className={styles.visualCard}>
            <Image
              src="/moneyback-home-hero.svg"
              alt="Illustration MoneyBack Web représentant la gestion des comptes"
              width={720}
              height={520}
              className={styles.heroImage}
              priority
            />
          </div>
        </section>
      </main>
    </CrudLayoutShell>
  );
}
