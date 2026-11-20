import React from 'react';
import { DocPage } from '../components/DocPage';
import { PRIVACY_SECTIONS, PRIVACY_UPDATED } from '../lib/privacy-policy-content';

export default function PrivacyScreen() {
  return <DocPage title="מדיניות פרטיות" updated={PRIVACY_UPDATED} sections={PRIVACY_SECTIONS} />;
}
