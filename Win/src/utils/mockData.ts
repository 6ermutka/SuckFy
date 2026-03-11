import { Track, TrackSource } from '../types'

// Mock tracks for testing
export const mockTracks: Track[] = [
  {
    id: '1',
    title: 'молчу',
    artist: 'murasame',
    album: 'Singles',
    duration: 188,
    source: TrackSource.SPOTIFY,
    artworkURL: 'https://via.placeholder.com/300/667eea/ffffff?text=Track+1',
    localURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  },
  {
    id: '2',
    title: 'священная война',
    artist: 'урал гайсин',
    album: 'War Songs',
    duration: 156,
    source: TrackSource.SOUNDCLOUD,
    artworkURL: 'https://via.placeholder.com/300/764ba2/ffffff?text=Track+2',
    localURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
  },
  {
    id: '3',
    title: 'Школа не нужна',
    artist: 'LIL MINTOL',
    album: 'School',
    duration: 134,
    source: TrackSource.SPOTIFY,
    artworkURL: 'https://via.placeholder.com/300/f093fb/ffffff?text=Track+3',
    localURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
  },
  {
    id: '4',
    title: 'bigpluggssd feat. фолли',
    artist: 'урал гайсин',
    album: 'Collaborations',
    duration: 201,
    source: TrackSource.SOUNDCLOUD,
    artworkURL: 'https://via.placeholder.com/300/4facfe/ffffff?text=Track+4',
    localURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
  },
  {
    id: '5',
    title: 'angeldustt + tewiq',
    artist: 'crystalblade',
    album: 'Angels',
    duration: 145,
    source: TrackSource.SPOTIFY,
    artworkURL: 'https://via.placeholder.com/300/00f2fe/ffffff?text=Track+5',
    localURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3'
  },
  {
    id: '6',
    title: 'САНЯ БОГДАНОВ',
    artist: 'LIL MINTOL',
    album: 'People',
    duration: 178,
    source: TrackSource.SPOTIFY,
    artworkURL: 'https://via.placeholder.com/300/43e97b/ffffff?text=Track+6',
    localURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3'
  },
  {
    id: '7',
    title: 'mad­k1d & тёмный принц',
    artist: 'nastya shimmer',
    album: 'Love',
    duration: 108,
    source: TrackSource.SOUNDCLOUD,
    artworkURL: 'https://via.placeholder.com/300/fa709a/ffffff?text=Track+7',
    localURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3'
  },
  {
    id: '8',
    title: 'расплать [ALT VER]',
    artist: 'tewiq',
    album: 'Alternative',
    duration: 111,
    source: TrackSource.SOUNDCLOUD,
    artworkURL: 'https://via.placeholder.com/300/fee440/ffffff?text=Track+8',
    localURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
  },
  {
    id: '9',
    title: '8 мила',
    artist: 'mad­k1d',
    album: '8 Mile',
    duration: 113,
    source: TrackSource.SOUNDCLOUD,
    artworkURL: 'https://via.placeholder.com/300/f72585/ffffff?text=Track+9',
    localURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3'
  },
  {
    id: '10',
    title: 'тёмный принц - solanaflipper',
    artist: 'euthanasia',
    album: 'Dark',
    duration: 66,
    source: TrackSource.SOUNDCLOUD,
    artworkURL: 'https://via.placeholder.com/300/b5179e/ffffff?text=Track+10',
    localURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3'
  }
]

// Clear all data - no mock data anymore
export const clearAllData = () => {
  localStorage.removeItem('suckfy_liked_songs')
  localStorage.removeItem('suckfy_playlists')
  localStorage.removeItem('suckfy_recently_played')
  localStorage.removeItem('suckfy_downloaded_tracks')
}
