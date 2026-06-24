'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Badge, Box, Button, Group, Menu, Text } from '@mantine/core';
import {
  IconCoins,
  IconChevronDown,
  IconFolder,
  IconCategory,
  IconBriefcase,
  IconUsers,
  IconCreditCard,
  IconArrowsShuffle,
  IconBuildingBank,
  IconRepeat,
  IconTool,
  IconCalendarRepeat,
  IconDatabaseExport,
  IconSettings,
} from '@tabler/icons-react';

const FLAT_LINKS = [
  { label: 'Opérations', prefix: '/operations' },
  { label: 'Statistiques', prefix: '/statistiques' },
  { label: 'Imports', prefix: '/imports' },
  { label: 'Portefeuille', prefix: '/portefeuille' },
];

const OUTILS_ITEMS = [
  { label: 'Environnement actif', href: '/outils/environnement', icon: IconSettings },
  { label: 'Génération abonnements', href: '/outils/generation-abonnements', icon: IconCalendarRepeat },
  { label: 'Sauvegarde base', href: '/outils/sauvegarde-base', icon: IconDatabaseExport },
];

const FICHIERS_ITEMS = [
  { label: 'Comptes', href: '/comptes', icon: IconBuildingBank },
  { label: 'Abonnements', href: '/abonnements', icon: IconRepeat },
  { label: 'Enveloppes', href: '/referentiels/enveloppes', icon: IconBriefcase },
  { label: 'Catégories', href: '/referentiels/categories', icon: IconCategory },
  { label: 'Regroupements', href: '/referentiels/regroupements', icon: IconFolder },
  { label: 'Moyens de paiement', href: '/referentiels/moyens-paiement', icon: IconCreditCard },
  { label: 'Types de mouvement', href: '/referentiels/types-mouvement', icon: IconArrowsShuffle },
  { label: 'Tiers', href: '/referentiels/tiers', icon: IconUsers },
];

const DARK_BG = '#1a1b1e';
const ACTIVE_COLOR = '#51cf66';
const APP_ENV_LABEL = process.env.NEXT_PUBLIC_APP_ENV_LABEL;
const APP_ENV_DESCRIPTION = process.env.NEXT_PUBLIC_APP_ENV_DESCRIPTION;

export function AppNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  const fichiersActive = FICHIERS_ITEMS.some(item => pathname.startsWith(item.href));
  const outilsActive = OUTILS_ITEMS.some(item => pathname.startsWith(item.href));

  return (
    <Box
      style={{
        background: DARK_BG,
        height: 50,
        borderBottom: '1px solid #2c2e33',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap" style={{ height: '100%', padding: '0 16px' }}>
        {/* Logo */}
        <Group gap={8} wrap="nowrap" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => router.push('/')}>
          <IconCoins size={22} color={ACTIVE_COLOR} />
          <Text fw={700} size="md" style={{ color: '#fff', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
            MoneyBack
          </Text>
        </Group>

        {/* Nav links */}
        <Group gap={0} wrap="nowrap" style={{ overflow: 'hidden', flex: 1, justifyContent: 'center' }}>
          {FLAT_LINKS.map(link => {
            const active = pathname.startsWith(link.prefix);
            return (
              <Button
                key={link.prefix}
                variant="subtle"
                size="xs"
                onClick={() => router.push(link.prefix)}
                style={{
                  color: active ? ACTIVE_COLOR : '#adb5bd',
                  fontWeight: active ? 700 : 400,
                  background: 'transparent',
                  whiteSpace: 'nowrap',
                  padding: '4px 10px',
                }}
              >
                {link.label}
              </Button>
            );
          })}

          <Menu
            position="bottom-start"
            offset={4}
            styles={{
              dropdown: { background: '#25262b', border: '1px solid #373a40', padding: '4px 0' },
              item: { color: '#c1c2c5', padding: '7px 14px', fontSize: 13 },
            }}
          >
            <Menu.Target>
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconTool size={12} />}
                rightSection={<IconChevronDown size={11} />}
                style={{
                  color: outilsActive ? ACTIVE_COLOR : '#adb5bd',
                  fontWeight: outilsActive ? 700 : 400,
                  background: 'transparent',
                  whiteSpace: 'nowrap',
                  padding: '4px 10px',
                }}
              >
                Outils
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {OUTILS_ITEMS.map(item => {
                const active = pathname.startsWith(item.href);
                return (
                  <Menu.Item
                    key={item.href}
                    leftSection={<item.icon size={14} />}
                    onClick={() => router.push(item.href)}
                    style={{ color: active ? ACTIVE_COLOR : '#c1c2c5', fontWeight: active ? 600 : 400 }}
                  >
                    {item.label}
                  </Menu.Item>
                );
              })}
            </Menu.Dropdown>
          </Menu>

          {/* Sous-menu Fichiers */}
          <Menu
            position="bottom-start"
            offset={4}
            styles={{
              dropdown: { background: '#25262b', border: '1px solid #373a40', padding: '4px 0' },
              item: { color: '#c1c2c5', padding: '7px 14px', fontSize: 13 },
            }}
          >
            <Menu.Target>
              <Button
                variant="subtle"
                size="xs"
                rightSection={<IconChevronDown size={11} />}
                style={{
                  color: fichiersActive ? ACTIVE_COLOR : '#adb5bd',
                  fontWeight: fichiersActive ? 700 : 400,
                  background: 'transparent',
                  whiteSpace: 'nowrap',
                  padding: '4px 10px',
                }}
              >
                Fichiers
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {FICHIERS_ITEMS.map(item => {
                const active = pathname.startsWith(item.href);
                return (
                  <Menu.Item
                    key={item.href}
                    leftSection={<item.icon size={14} />}
                    onClick={() => router.push(item.href)}
                    style={{ color: active ? ACTIVE_COLOR : '#c1c2c5', fontWeight: active ? 600 : 400 }}
                  >
                    {item.label}
                  </Menu.Item>
                );
              })}
            </Menu.Dropdown>
          </Menu>
        </Group>

        {/* Right */}
        <Group gap={8} wrap="nowrap" style={{ flexShrink: 0 }}>
          {APP_ENV_LABEL ? (
            <Group gap={6} wrap="nowrap">
              <Badge color="orange" variant="filled" radius="sm">
                {APP_ENV_LABEL}
              </Badge>
              {APP_ENV_DESCRIPTION ? (
                <Text size="xs" style={{ color: '#fab005', whiteSpace: 'nowrap' }}>
                  {APP_ENV_DESCRIPTION}
                </Text>
              ) : null}
            </Group>
          ) : null}
          <Text size="xs" style={{ color: '#868e96', whiteSpace: 'nowrap' }}>
            Admin
          </Text>
          <Button size="xs" variant="default" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            Déconnexion
          </Button>
        </Group>
      </Group>
    </Box>
  );
}
