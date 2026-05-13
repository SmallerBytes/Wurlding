import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Worlds from './pages/Worlds';
import WorldDetail from './pages/WorldDetail';
import Stories from './pages/Stories';
import StoryEditor from './pages/StoryEditor';
import Characters from './pages/Characters';
import CharacterSheet from './pages/CharacterSheet';
import Locations from './pages/Locations';
import Factions from './pages/Factions';
import Items from './pages/Items';
import Events from './pages/Events';
import Bestiary from './pages/Bestiary';
import FieldGuide from './pages/FieldGuide';
import FamilyTree from './pages/FamilyTree';
import MapCreator from './pages/MapCreator';
import WorldWeb from './pages/WorldWeb';
import About from './pages/About';

export default function App() {
  // In Electron production we load via file://, so BrowserRouter breaks.
  const Router = import.meta.env.PROD ? HashRouter : BrowserRouter;
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="worlds" element={<Worlds />} />
          <Route path="worlds/new" element={<WorldDetail />} />
          <Route path="worlds/:id" element={<WorldDetail />} />
          <Route path="stories" element={<Stories />} />
          <Route path="stories/new" element={<StoryEditor />} />
          <Route path="stories/:id" element={<StoryEditor />} />
          <Route path="characters" element={<Characters />} />
          <Route path="characters/new" element={<CharacterSheet />} />
          <Route path="characters/:id" element={<CharacterSheet />} />
          <Route path="locations" element={<Locations />} />
          <Route path="factions" element={<Factions />} />
          <Route path="items" element={<Items />} />
          <Route path="events" element={<Events />} />
          <Route path="bestiary" element={<Bestiary />} />
          <Route path="field-guide" element={<FieldGuide />} />
          <Route path="family" element={<FamilyTree />} />
          <Route path="map" element={<MapCreator />} />
          <Route path="web" element={<WorldWeb />} />
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </Router>
  );
}
