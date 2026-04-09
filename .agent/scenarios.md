# Attack Scenarios

Oura provides three built-in attack scenarios, each generating a distinct k6 script template.

## Bombard

Constant load with fixed virtual users for the entire duration.

**When to use:** Baseline load testing, verifying target handles sustained traffic.

**Generated k6 options:**
```javascript
export const options = {
  vus: <number>,
  duration: "<duration>",
};
```

**Behavior:** All VUs start immediately and maintain constant load until duration expires.

---

## Ramping

Progressive load increase and decrease across defined stages.

**When to use:** Finding performance thresholds, observing how the target responds to gradually increasing traffic.

**Generated k6 options:**
```javascript
export const options = {
  stages: [
    { duration: "10s", target: 10 },
    { duration: "20s", target: 100 },
    { duration: "10s", target: 100 },
    { duration: "10s", target: 0 },
  ],
};
```

**Ramp-up format:** `"target:duration,target:duration,..."`  
Example: `"0:10s,50:30s,100:60s,50:30s,0:10s"`

If `--ramp-up` is not provided, default stages are calculated based on `--vus`:
1. 10% VUs for 10s (ramp up)
2. 100% VUs for 20s (sustain)
3. 100% VUs for 10s (sustain)
4. 0 VUs for 10s (ramp down)

---

## Soak

Prolonged test with progressive load increase to identify breaking points and memory leaks.

**When to use:** Long-duration testing (typically 20+ minutes), finding sustained-load degradation.

**Generated k6 options:**
```javascript
export const options = {
  stages: [
    { duration: "2m", target: 50 },   // 50% VUs
    { duration: "5m", target: 50 },   // soak at 50%
    { duration: "2m", target: 75 },   // 75% VUs
    { duration: "5m", target: 75 },   // soak at 75%
    { duration: "2m", target: 100 },  // 100% VUs
    { duration: "5m", target: 100 },  // soak at max
    { duration: "3m", target: 0 },    // ramp down
  ],
};
```

All stage percentages are calculated from the `--vus` value.

---

## Adding Custom Scenarios

To add a new attack scenario:

1. Create a new template file at `src/k6/templates/<name>.ts`
2. Export a function with signature: `(opts: AttackOptions) => string`
3. The function must return valid k6 JavaScript (ES module syntax)
4. Register it in `K6Runner.templates` in `src/k6/runner.ts`:
   ```typescript
   this.templates = {
     bombard: bombardTemplate,
     ramping: rampingTemplate,
     soak: soakTemplate,
     yourNew: yourNewTemplate, // add here
   };
   ```
5. Update attack command help text and `--scenario` option description