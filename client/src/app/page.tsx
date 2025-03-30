import HomeComponent from "@/components/home/home.component";
import FooterComponent from "@/components/footer/footer.component";

export default function Home() {
  return (
    <div>
      <main>
        <HomeComponent />
      </main>
      <footer>
        <FooterComponent />
      </footer>
    </div>
  );
}
