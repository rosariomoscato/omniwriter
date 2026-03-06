/**
 * UpgradeModal Component
 * Feature #402: This component is deprecated and no longer needed.
 * All authenticated users now have full access to all features.
 * This stub returns null to avoid breaking existing imports.
 */
interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function UpgradeModal({ isOpen, onClose, title, description }: UpgradeModalProps) {
  return null;
}
