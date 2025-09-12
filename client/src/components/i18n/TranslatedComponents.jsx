import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Translated Button Component
export function TranslatedButton({ translationKey, variant = "default", size = "default", className = "", ...props }) {
  const { t } = useTranslation();
  
  return (
    <Button variant={variant} size={size} className={className} {...props}>
      {t(translationKey)}
    </Button>
  );
}

// Translated Label Component
export function TranslatedLabel({ translationKey, htmlFor, className = "", required = false }) {
  const { t } = useTranslation();
  
  return (
    <Label htmlFor={htmlFor} className={className}>
      {t(translationKey)}
      {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
  );
}

// Status Badge Component
export function StatusBadge({ status, translationPrefix = "" }) {
  const { t } = useTranslation();
  
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {t(`${translationPrefix}.status_${status?.toLowerCase()}`)}
    </span>
  );
}

// Common Form Validation Messages
export function ValidationMessage({ error, translationKey }) {
  const { t } = useTranslation();
  
  if (!error) return null;
  
  return (
    <div className="text-sm text-red-600 mt-1">
      {t(translationKey || 'forms.validation.required')}
    </div>
  );
}

// Page Header Component
export function PageHeader({ titleKey, descriptionKey, icon: Icon }) {
  const { t } = useTranslation();
  
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-green-900 mb-2 flex items-center gap-2">
        {Icon && <Icon className="h-7 w-7 text-green-700" />}
        {t(titleKey)}
      </h1>
      {descriptionKey && (
        <p className="text-gray-600">{t(descriptionKey)}</p>
      )}
    </div>
  );
}

// Loading State Component
export function LoadingState({ titleKey = "common.loading", subtitleKey, data = {} }) {
  const { t } = useTranslation();
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center">
        <div className="text-lg font-semibold text-green-900 mb-4">
          {t(titleKey)}
        </div>
        {subtitleKey && (
          <div className="text-sm text-gray-600">
            {t(subtitleKey, data)}
          </div>
        )}
      </div>
    </div>
  );
}

// Error State Component
export function ErrorState({ titleKey = "common.error", messageKey, message, actionKey, actionHref, data = {} }) {
  const { t } = useTranslation();
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center">
        <div className="text-lg font-semibold text-red-600 mb-4">
          {t(titleKey)}
        </div>
        <div className="text-sm text-gray-600 mb-4">
          {messageKey ? t(messageKey, data) : message}
        </div>
        {actionKey && actionHref && (
          <div className="mt-4">
            <a
              href={actionHref}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium inline-block"
            >
              {t(actionKey)}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}