# Team Change Feature - Admin Panel

## Overview
Added functionality to the admin player management panel that allows administrators to change the team a player belongs to.

## Implementation Details

### Backend Changes

#### 1. Repository Layer (`backend/src/repositories/player.repo.ts`)
- Added `updatePlayerTeam(id: number, teamId: number)` method
- Updates the `teamId` field in the Player table

#### 2. Service Layer (`backend/src/services/player.service.ts`)
- Added `updatePlayerTeam(id: number, teamId: number)` method
- Includes validation to ensure teamId is a valid positive integer
- Throws error if teamId is invalid

#### 3. Controller Layer (`backend/src/controllers/player.controller.ts`)
- Added `updatePlayerTeam(req, reply)` endpoint handler
- Validates request body contains valid teamId
- Returns 400 error if teamId is missing or invalid
- Returns 200 with updated player data on success

#### 4. Routes (`backend/src/routes/player.routes.ts`)
- Registered new route: `PATCH /api/players/:id/team`
- Marked as Private (Admin) access

### Frontend Changes

#### 1. Service Layer (`frontend/services/PlayerService.ts`)
- Added `updatePlayerTeam(id: number, teamId: number)` method
- Calls backend PATCH endpoint `/api/players/:id/team`
- Returns updated PlayerWithPrice object

#### 2. Admin Panel UI (`frontend/pages/admin/GestionJugadores.tsx`)

**State Management:**
- Added `editedTeams` state to track pending team changes
- Integrated with existing `editedPrices` and `editedPositions` pattern

**TeamDropdown Component:**
- New dropdown component showing all La Liga teams
- Displays team crest and name
- Modal interface matching existing Dropdown pattern
- Shows team crests in both button and modal

**Player Row Updates:**
- Added `isTeamEdited` flag for each player
- Added `currentTeamId` that reflects edited or original value
- Team dropdown renders below position dropdown
- Default value set to player's current team

**Save Handler:**
- Extended `handleSavePrices` to process team changes
- Validates and saves team updates alongside price and position changes
- Clears `editedTeams` state after successful save
- Updates change counter to include team edits

**UI Indicators:**
- Save button shows total count including team changes
- Change tracking includes team edits in `hasChanges` check

## Usage

1. Navigate to Admin Panel → Gestión de Jugadores
2. Find the player you want to reassign
3. Click on the "Equipo" dropdown for that player
4. Select the new team from the list (shows team crest and name)
5. The dropdown will highlight in blue indicating a pending change
6. Click "GUARDAR CAMBIOS" button at the bottom
7. All changes (prices, positions, teams) are saved together

## API Endpoint

```
PATCH /api/players/:id/team
Body: { teamId: number }
Response: { success: true, message: string, data: PlayerWithPrice }
```

## Validation Rules

- teamId must be a positive integer
- teamId must correspond to an existing team
- Multiple team changes can be batched together with other edits
- Changes are only persisted when "GUARDAR CAMBIOS" is clicked

## Benefits

- **Transfer Management**: Easily update player teams when real-world transfers occur
- **Data Correction**: Fix misassigned players
- **Batch Operations**: Change multiple players' teams along with prices/positions in one save
- **Visual Feedback**: Team crests provide clear visual confirmation
- **Consistent UX**: Matches existing price and position editing patterns
