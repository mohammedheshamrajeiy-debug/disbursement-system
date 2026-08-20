import { useTranslation } from "react-i18next";
import RequestFormScreen from '../components/RequestFormScreen.jsx';

export default function RequestScreen() {
  const { t } = useTranslation();
  return <RequestFormScreen source="disbursement" typeLabel={t('requestScreen.agent')} />;
}
