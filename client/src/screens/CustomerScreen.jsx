import { useTranslation } from 'react-i18next';
import RequestFormScreen from '../components/RequestFormScreen.jsx';

export default function CustomerScreen() {
  const { t } = useTranslation();
  return <RequestFormScreen source="customer" typeLabel={t('customerScreen.customer')} />;
}
