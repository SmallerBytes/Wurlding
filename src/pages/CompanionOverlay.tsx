import PixelCritters from '../components/PixelCritters';

/**
 * Transparent Electron overlay: companions roam the desktop even when the main
 * window is minimized. Click-through is handled by the BrowserWindow.
 */
export default function CompanionOverlay() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-transparent">
      <PixelCritters />
    </div>
  );
}
