import Navigation from '@/components/(Landing)/Navigation';
import HeroSection from '@/components/(Landing)/HeroSection';
import './App.css';

const App = () => {
  return (
    <div className="App">
      <Navigation />
      <HeroSection />
      <section className="outro">
        <h1>Join teams building faster with Byewind</h1>
      </section>
    </div>
  );
};

export default App;
