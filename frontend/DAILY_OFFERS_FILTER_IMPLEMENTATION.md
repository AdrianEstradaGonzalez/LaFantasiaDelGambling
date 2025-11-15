# Daily Offers Filter - Frontend Implementation

## Overview
Added a filter to the Players Market to display only players on daily offer with visual indicators and automatic price discounts.

## Implementation Summary

### 1. State Management
**File:** `frontend/pages/players/PlayersMarket.tsx`

Added two new state variables:
```typescript
const [onlyOffers, setOnlyOffers] = useState(false);        // Toggle filter
const [dailyOffers, setDailyOffers] = useState<Set<number>>(new Set()); // Player IDs on offer
```

### 2. Data Loading
**Location:** Inside `loadPlayers` callback (after liga data loads)

```typescript
// 🏷️ Cargar ofertas del día
try {
  const offers = await DailyOffersService.getTodayOffers(division);
  const offerPlayerIds = new Set(offers.map(o => o.playerId));
  setDailyOffers(offerPlayerIds);
  console.log(`🎁 Ofertas del día cargadas: ${offerPlayerIds.size} jugadores`);
} catch (error) {
  console.warn('⚠️ Error cargando ofertas del día:', error);
  setDailyOffers(new Set()); // Non-critical, continue without offers
}
```

### 3. Filter Logic
**Location:** Inside `filtered` useMemo

Added offer filtering before sorting:
```typescript
// Filtro por ofertas del día
if (onlyOffers) {
  list = list.filter(p => dailyOffers.has(p.id));
}
```

Updated dependencies:
```typescript
}, [players, posFilter, teamFilter, query, selectMode, filterByRole, sortOrder, sortType, onlyOffers, dailyOffers]);
```

### 4. UI Filter Toggle
**Location:** After sorting buttons, before search input

Added prominent toggle button with offer count badge:
```typescript
<TouchableOpacity
  onPress={() => setOnlyOffers(!onlyOffers)}
  style={{
    backgroundColor: onlyOffers ? '#10b981' : '#1a2332',
    borderWidth: 1,
    borderColor: onlyOffers ? '#10b981' : '#334155',
    // ... styling
  }}
>
  <Text style={{ fontSize: 20 }}>🎁</Text>
  <Text>
    {onlyOffers ? 'Ofertas del Día (Activo)' : 'Mostrar Solo Ofertas'}
  </Text>
  {dailyOffers.size > 0 && (
    <View style={{ /* badge styling */ }}>
      <Text>{dailyOffers.size}</Text>
    </View>
  )}
</TouchableOpacity>
```

### 5. Visual Indicators on Player Cards
**Location:** Price display section in player card rendering

Added discount badge and price indicators:
```typescript
<View style={{ alignItems: 'center', position: 'relative' }}>
  <Text style={{ color: '#94a3b8', fontSize: 11 }}>PRECIO</Text>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    {dailyOffers.has(p.id) && (
      <View style={{ backgroundColor: '#f59e0b', /* ... */ }}>
        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>-20%</Text>
      </View>
    )}
    <Text style={{ 
      color: dailyOffers.has(p.id) ? '#10b981' : '#fbbf24', 
      fontSize: 18, 
      fontWeight: '800'
    }}>
      {dailyOffers.has(p.id) ? Math.round(p.price * 0.8) : p.price}M
    </Text>
  </View>
  {dailyOffers.has(p.id) && (
    <Text style={{ 
      color: '#64748b', 
      fontSize: 10, 
      textDecorationLine: 'line-through'
    }}>
      {p.price}M
    </Text>
  )}
</View>
```

### 6. Purchase Logic with Offer Prices
**Functions:** `handleBuyPlayer` and `handleSelectFromPlantilla`

#### handleBuyPlayer
Added effective price calculation:
```typescript
// Calcular precio efectivo (con descuento si está en oferta)
const isOnOffer = dailyOffers.has(player.id);
const effectivePrice = isOnOffer ? Math.round(player.price * 0.8) : player.price;

// Verificar presupuesto
if (budget < effectivePrice) {
  // Show error with effective price
}

// Purchase with offer price
const result = await SquadService.addPlayerToSquad(ligaId, {
  // ...
  pricePaid: effectivePrice, // Usar precio con descuento si aplica
});
```

#### handleSelectFromPlantilla
Same logic applied with enhanced error messages:
```typescript
const isOnOffer = dailyOffers.has(player.id);
const effectivePrice = isOnOffer ? Math.round(player.price * 0.8) : player.price;

// Budget check with offer info
if (availableBudget < effectivePrice) {
  const priceInfo = isOnOffer 
    ? `\n🎁 Precio con oferta (-20%): ${effectivePrice}M (${player.price}M normal)`
    : `\nPrecio: ${effectivePrice}M`;
  // Show error with price info
}
```

## User Experience Features

### Visual Feedback
1. **Filter Button**: 
   - Gray when inactive with text "Mostrar Solo Ofertas"
   - Green when active with text "Ofertas del Día (Activo)"
   - Shows count badge with number of available offers

2. **Player Cards**:
   - **-20% Badge**: Orange badge next to discounted price
   - **Green Price**: Offer price displayed in green (vs yellow normal)
   - **Strikethrough**: Original price shown below in gray with strikethrough

3. **Budget Messages**: Include offer price details when budget is insufficient

### Functional Integration
- Loads offers automatically when market loads
- Non-blocking: Continues if offer loading fails
- Respects existing filters (position, team, search)
- Works in both normal and selection modes
- Discount applies automatically at purchase

## Testing Checklist

- [ ] Filter loads daily offers for each division (primera, segunda, premier)
- [ ] Toggle button shows/hides only offered players
- [ ] Badge count matches number of offers
- [ ] Discount badge appears on offered players
- [ ] Price shown is 80% of original (rounded)
- [ ] Original price shows strikethrough
- [ ] Budget validation uses offer price
- [ ] Purchase saves offer price in `pricePaid` field
- [ ] Filter works with position/team/search filters
- [ ] Filter works in selection mode from plantilla
- [ ] Non-critical error handling (continues without offers)

## Dependencies

### Services
- `DailyOffersService.getTodayOffers(division)`: Fetch offers from API
- Backend endpoint: `GET /daily-offers?division={division}`

### Backend Requirements
- Daily offers must be generated via cron job
- Endpoint: `https://lafantasiadelgambling.onrender.com/player-stats/generate-daily-offers`
- Authentication: `X-Cron-Token` header
- Schedule: Daily at midnight

## Notes
- Offers are division-specific (50 per division)
- Discount is always 20% (hardcoded in calculation)
- Player IDs stored in Set for O(1) lookup performance
- Offer loading is non-blocking to ensure market loads even if offers fail
- SquadPlayer.pricePaid stores the actual price paid (with discount if applicable)
- When selling, player receives their original pricePaid (not current market price)

## Next Steps
1. Run database migration: `npx tsx backend/scripts/add-daily-offers.ts`
2. Generate initial offers: `npx tsx backend/scripts/generate-daily-offers.ts`
3. Configure cron job at cron-job.org for daily generation
4. Test filter with all three divisions
5. Monitor offer loading performance
6. Consider adding offer expiration countdown timer (optional enhancement)
