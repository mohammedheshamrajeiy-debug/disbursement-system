import { useTranslation } from 'react-i18next';
import RequestFormScreen from '../request/RequestFormScreen.jsx';
import { useState } from "react";

export default function CustomerScreen() {
  const { t } = useTranslation();

  return (
    <>
      <RequestFormScreen source="customer" typeLabel={t('customerScreen.customer')} />
    </>
  );
}
