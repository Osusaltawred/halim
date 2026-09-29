import { lazy, Suspense } from "react";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { PlayerProvider } from "@/lib/player";
import { Layout } from "@/components/Layout";
import { Player } from "@/components/Player";
import Home from "@/pages/Home";
import Songs from "@/pages/Songs";
import { SongDetail, RecordingDetail, EventDetail, PersonDetail } from "@/pages/Details";
import { EventList, MovieList, PeopleList, RecordingsList, PhotoGallery, Timeline, TimelineYear, SearchPage } from "@/pages/Lists";

const Admin = lazy(() => import("@/pages/Admin"));
const AdminPage = () => (<Suspense fallback={<div className="p-10 text-center text-muted-foreground">…</div>}><Admin /></Suspense>);

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/songs" component={Songs} />
      <Route path="/songs/decade/:decade">{(p) => <Songs params={p} />}</Route>
      <Route path="/songs/:id">{(p) => <SongDetail key={p.id} params={p} />}</Route>
      <Route path="/recordings/:id">{(p) => <RecordingDetail key={p.id} params={p} />}</Route>
      <Route path="/concerts">{() => <EventList key="c" entity="concerts" />}</Route>
      <Route path="/concerts/:id">{(p) => <EventDetail key={"c" + p.id} entity="concerts" params={p} />}</Route>
      <Route path="/sessions">{() => <EventList key="s" entity="sessions" />}</Route>
      <Route path="/sessions/:id">{(p) => <EventDetail key={"s" + p.id} entity="sessions" params={p} />}</Route>
      <Route path="/interviews">{() => <EventList key="i" entity="interviews" />}</Route>
      <Route path="/interviews/:id">{(p) => <EventDetail key={"i" + p.id} entity="interviews" params={p} />}</Route>
      <Route path="/movies" component={MovieList} />
      <Route path="/movies/:id">{(p) => <EventDetail key={"m" + p.id} entity="movies" params={p} />}</Route>
      <Route path="/people" component={PeopleList} />
      <Route path="/people/:id">{(p) => <PersonDetail key={p.id} params={p} />}</Route>
      <Route path="/photos">{() => <PhotoGallery />}</Route>
      <Route path="/photos/:id">{(p) => <PhotoGallery key={p.id} params={p} />}</Route>
      <Route path="/timeline" component={Timeline} />
      <Route path="/timeline/:year">{(p) => <TimelineYear key={p.year} params={p} />}</Route>
      <Route path="/archive">{() => <RecordingsList key="a" />}</Route>
      <Route path="/rare">{() => <RecordingsList key="r" rare />}</Route>
      <Route path="/search/:q">{(p) => <SearchPage key={p.q} params={p} />}</Route>
      <Route path="/search">{() => <SearchPage params={{}} />}</Route>
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PlayerProvider>
          <Router hook={useHashLocation}>
            <Layout>
              <AppRouter />
            </Layout>
            <Player />
          </Router>
        </PlayerProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
