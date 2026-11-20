import React from 'react';
import { DocPage } from '../components/DocPage';
import { TERMS_SECTIONS, TERMS_UPDATED } from '../lib/terms-content';

export default function TermsScreen() {
  return <DocPage title="תנאי שימוש" updated={TERMS_UPDATED} sections={TERMS_SECTIONS} />;
}
