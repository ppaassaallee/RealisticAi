import BankKiosk from "@/components/banking/BankKiosk";
import ExperienceSwitcher from "@/components/ExperienceSwitcher";
export const metadata = {
  title: "Juliana | Banco Interior",
  description:
    "Cerca de vos, estés donde estés. Experiencia bancaria demostrativa.",
};
export default function Page() {
  return (
    <>
      <BankKiosk />
      <ExperienceSwitcher current="juliana" />
    </>
  );
}
