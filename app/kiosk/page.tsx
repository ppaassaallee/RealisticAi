import Kiosk from "@/components/Kiosk";
import ExperienceSwitcher from "@/components/ExperienceSwitcher";
export default function Page() {
  return (
    <>
      <Kiosk />
      <ExperienceSwitcher current="alex" />
    </>
  );
}
