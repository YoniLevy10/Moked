import { LandingHeader } from "./LandingHeader";
import { LandingHero } from "./LandingHero";
import {
  LandingCapabilitiesSection,
  LandingContactSection,
  LandingFooter,
  LandingProcessSection,
  LandingWhySection,
} from "./LandingSections";

const pilotNumber = process.env.NEXT_PUBLIC_PILOT_WHATSAPP || "972548102688";
const whatsappHref = `https://wa.me/${pilotNumber}?text=${encodeURIComponent("שלום, אשמח לשמוע עוד על מוקד")}`;

export function MokedLandingPage() {
  return (
    <div className="moked-landing">
      <LandingHeader whatsappHref={whatsappHref} />
      <main id="main-content">
        <LandingHero whatsappHref={whatsappHref} />
        <LandingProcessSection />
        <LandingCapabilitiesSection />
        <LandingWhySection />
        <LandingContactSection whatsappHref={whatsappHref} />
      </main>
      <LandingFooter />
    </div>
  );
}
