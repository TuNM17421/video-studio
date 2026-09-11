# ZoneLabel (editorial)

Uppercase lane / zone label: white pill, 2 px colored stroke, 16 px bold with 1.5 px tracking,
centered on (x, y). Sits ON a lane line or on the top edge of an enclosure
("OPERATIONS", "BUILD", "DEPLOY", "TELEMETRY", "GOVERNANCE", "BULKHEAD").

```jsx
<ZoneLabel x={260} y={300} label="OPERATIONS" />
<ZoneLabel x={1500} y={620} label="GOVERNANCE" color={C.red} />
```
