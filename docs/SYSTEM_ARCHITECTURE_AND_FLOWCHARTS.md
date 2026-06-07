# KIEN TRUC HE THONG VA SO DO THUAT TOAN CIRCUITTH

Tai lieu nay mo ta kien truc va luong xu ly cua CircuitTH theo code hien tai.

## 1. Kien truc he thong

```mermaid
flowchart LR
    U[User]

    subgraph Browser["Trinh duyet nguoi dung"]
        subgraph UI["Presentation Layer - React"]
            TB[Toolbar]
            SB[Component Bar]
            CV[Canvas Schematic]
            PP[Properties Panel]
            WP[Waveform Panel]
            CP[Console Panel]
        end

        subgraph APP["Application / State Layer"]
            A[App.tsx]
            VP[useViewport]
            NL[Netlist Generator]
        end

        subgraph INFRA["Infrastructure Layer"]
            CE[CircuitEngine Wrapper]
            WASM[Circuit Engine WASM]
            PL[Plotly.js]
            ST[Circuit Storage Service]
            IDB[(IndexedDB)]
            LS[(localStorage)]
        end
    end

    U --> TB
    U --> SB
    U --> CV
    U --> PP
    U --> WP

    TB <--> A
    SB <--> A
    CV <--> A
    PP <--> A
    WP <--> A
    CP <--> A

    CV <--> VP
    A --> NL
    NL --> CE
    CE --> WASM
    WASM --> CE
    CE --> A
    A --> WP
    WP --> PL

    A <--> ST
    ST <--> IDB
    ST <--> LS
```

### Phan tach trach nhiem

| Tang | Module chinh | Trach nhiem |
|---|---|---|
| Giao dien | `Toolbar`, `Sidebar`, `Canvas`, `PropertiesPanel`, `WaveformPanel` | Nhan thao tac va hien thi |
| Dieu phoi | `App.tsx` | Quan ly state, file mach, cau hinh va mo phong |
| Do hoa schematic | `Canvas.tsx`, `useViewport.ts` | Ve, hit-test, pan, zoom, dat linh kien va day |
| Bien dich mach | `netlist.ts`, `unionFind.ts` | Xac dinh node dien va sinh netlist |
| Giai mach | `circuitEngine.ts`, WASM | Chay OP, DC, AC, TRAN |
| Truc quan hoa | `WaveformPanel.tsx`, Plotly | Ve OP, DC Sweep, DC Y-X, Bode va Transient |
| Luu tru | `circuitStorage.ts` | Autosave va quan ly nhieu file mach trong IndexedDB |

---

## 2. Flowchart muc 1 - Tong quan chuong trinh

```mermaid
flowchart TD
    START([Mo CircuitTH])
    LOAD[Doc danh sach mach tu IndexedDB]
    HAS{Da co mach?}
    NEW[Tao Untitled Circuit]
    OPEN[Mo mach gan nhat]
    EDIT[Ve va chinh sua schematic]
    SAVE[Autosave vao IndexedDB]
    RUN{Nhan Run?}
    NET[Sinh netlist]
    SOLVE[WASM giai mach]
    OK{Thanh cong?}
    RESULT[Hien thi console va waveform]
    ERROR[Hien thi loi]

    START --> LOAD --> HAS
    HAS -- Khong --> NEW --> EDIT
    HAS -- Co --> OPEN --> EDIT
    EDIT --> SAVE --> EDIT
    EDIT --> RUN
    RUN -- Chua --> EDIT
    RUN -- Co --> NET --> SOLVE --> OK
    OK -- Co --> RESULT --> EDIT
    OK -- Khong --> ERROR --> EDIT
```

---

## 3. Flowchart muc 2 - Theo muc goi ham

### 3.1 Khoi dong va luu file mach

```mermaid
flowchart TD
    APP[App render]
    HYD[useEffect hydrate]
    LIST[listCircuits]
    ODB[openDb]
    TX[tx getAll]
    ACTIVE[getActiveCircuitId]
    LOAD[loadCircuit]
    CREATE[createCircuit]
    SAVE[saveCircuit]
    AUTOSAVE[useEffect autosave 350 ms]

    APP --> HYD --> LIST --> ODB --> TX
    TX -->|Co file| ACTIVE --> LOAD
    TX -->|Khong co file| CREATE --> SAVE --> LOAD

    APP --> AUTOSAVE --> SAVE
    SAVE --> ODB
```

### 3.2 Chinh sua schematic

```mermaid
flowchart TD
    INPUT[Mouse / Keyboard]
    DOWN[handleMouseDown]
    MOVE[handleMouseMove]
    UP[handleMouseUp]
    WHEEL[handleWheel]
    KEY[handleKeyDown]

    PLACE[Dat component]
    WIRE[Ve wire]
    SELECT[Chon / keo component]
    PAN[beginPan / continuePan / endPan]
    ZOOM[zoomAt]
    ACTION[Rotate / Flip / Delete]
    STATE[Cap nhat components / wires]
    RENDER[render]

    INPUT --> DOWN
    INPUT --> MOVE
    INPUT --> UP
    INPUT --> WHEEL
    INPUT --> KEY

    DOWN --> PLACE --> STATE
    DOWN --> WIRE --> STATE
    DOWN --> SELECT --> STATE
    DOWN --> PAN
    MOVE --> PAN
    UP --> PAN
    WHEEL --> ZOOM
    KEY --> ACTION --> STATE

    STATE --> RENDER
    PAN --> RENDER
    ZOOM --> RENDER
```

### 3.3 Chay mo phong

```mermaid
flowchart TD
    RUN[Toolbar onRun]
    RS[App.runSimulation]
    GN[generateNetlist]
    UF[UnionFind]
    CMD[Thay .op bang .dc / .ac / .tran]
    GE[getEngine]
    LE[loadEngine]
    SIM[CircuitEngine.simulate]
    WASM[WASM simulate]
    PARSE[JSON.parse SimulationResult]
    SUCCESS{result.success?}
    LOG[Log console]
    WAVE[WaveformPanel]
    PLOT[Plotly.react]

    RUN --> RS --> GN --> UF
    GN --> CMD --> GE
    GE -->|Chua load| LE --> SIM
    GE -->|Da load| SIM
    SIM --> WASM --> PARSE --> SUCCESS
    SUCCESS -- Khong --> LOG
    SUCCESS -- Co --> LOG
    SUCCESS -- Co --> WAVE --> PLOT
```

### 3.4 Quan he cac component React

```mermaid
flowchart TD
    A[App]
    T[Toolbar]
    S[Sidebar]
    C[Canvas]
    P[PropertiesPanel]
    W[WaveformPanel]

    A -->|config, callbacks, files| T
    T -->|Run, settings, file actions| A

    A -->|selectedTool| S
    S -->|setSelectedTool| A

    A -->|components, wires, selection| C
    C -->|setComponents, setWires, selection| A

    A -->|selectedComponent| P
    P -->|onUpdate, onDelete| A

    A -->|SimulationResult| W
    W -->|close, resize| A
```

---

## 4. Flowchart muc 3 - Chi tiet tung nhom ham

### 4.1 `App.runSimulation()`

```mermaid
flowchart TD
    START([runSimulation])
    GEN[generateNetlist components, wires]
    MODE{simConfig.mode}
    OP[simLine = .op]
    DC[simLine = .dc source start stop step]
    AC[simLine = .ac type points fstart fstop]
    TRAN[simLine = .tran step stop]
    REPLACE[Thay dong .op trong netlist]
    UI[Mo console, xoa log cu, loading = true]
    ENGINE[getEngine]
    SIM[engine.simulate netlist]
    OK{success?}
    SET[setResult va mo waveform]
    OUT{analysis_type}
    OUTOP[In node voltage va branch current]
    OUTDC[In mau DC sweep]
    OUTAC[In mau Bode]
    OUTTRAN[In mau transient]
    ERR[In error_msg / exception]
    DONE[loading = false; log Done]

    START --> GEN --> MODE
    MODE -- op --> OP
    MODE -- dc --> DC
    MODE -- ac --> AC
    MODE -- tran --> TRAN
    OP --> REPLACE
    DC --> REPLACE
    AC --> REPLACE
    TRAN --> REPLACE
    REPLACE --> UI --> ENGINE --> SIM --> OK
    OK -- Khong --> ERR --> DONE
    OK -- Co --> SET --> OUT
    OUT -- op --> OUTOP --> DONE
    OUT -- dc --> OUTDC --> DONE
    OUT -- ac --> OUTAC --> DONE
    OUT -- tran --> OUTTRAN --> DONE
```

### 4.2 `generateNetlist()`

```mermaid
flowchart TD
    START([generateNetlist])
    UF[Tao UnionFind]
    WW[Noi cac diem lien tiep tren tung wire]
    TJ[Tim T-junction wire voi wire]
    PW[Noi pin nam tren wire]
    GND{Co GND?}
    REAL[Gan root cua GND thanh node 0]
    AUTO[Chon pin dau tien lam node 0]
    MODEL[Tao model lines cho diode va LED]
    LOOP[Duyet tung component]
    NODE[getNode cho cac pin]
    TYPE{Loai component}
    BASIC[Sinh R C L V I]
    DEP[Sinh E F G H]
    SEMI[Sinh D LED]
    SW[Sinh switch thanh resistor]
    TR[Sinh BJT / MOSFET thanh VCCS + output resistor]
    END[Them analysis placeholder .op va .end]
    RETURN([Tra netlist string])

    START --> UF --> WW --> TJ --> PW --> GND
    GND -- Co --> REAL --> MODEL
    GND -- Khong --> AUTO --> MODEL
    MODEL --> LOOP --> NODE --> TYPE
    TYPE --> BASIC --> LOOP
    TYPE --> DEP --> LOOP
    TYPE --> SEMI --> LOOP
    TYPE --> SW --> LOOP
    TYPE --> TR --> LOOP
    LOOP -->|Het component| END --> RETURN
```

### 4.3 `Canvas.handleMouseDown()`

```mermaid
flowchart TD
    START([handleMouseDown])
    POS[getScreenXY -> toWorld -> snap]
    TOOL{Dang chon tool gi?}

    COMP[Tao CircuitComponent mac dinh]
    ADD[Them vao components va chon component]

    WIRESTATE{Dang ve wire?}
    BEGIN[Tim pin / diem tren wire; bat dau tempWire]
    ENDPOINT{Click trung pin / wire?}
    FINISH[Hoan thanh wire]
    CORNER[Them diem gap vuong vao tempWire]

    HITC{Trung component?}
    DRAG[Chon component va bat dau drag]
    HITW{Trung wire?}
    SELW[Chon wire]
    PAN[Bat dau pan]

    START --> POS --> TOOL
    TOOL -- Component --> COMP --> ADD
    TOOL -- Wire --> WIRESTATE
    WIRESTATE -- Chua ve --> BEGIN
    WIRESTATE -- Dang ve --> ENDPOINT
    ENDPOINT -- Co --> FINISH
    ENDPOINT -- Khong --> CORNER
    TOOL -- Select --> HITC
    HITC -- Co --> DRAG
    HITC -- Khong --> HITW
    HITW -- Co --> SELW
    HITW -- Khong --> PAN
```

### 4.4 `Canvas.render()`

```mermaid
flowchart TD
    START([render])
    CLEAR[clearRect]
    TRANSFORM[Ap dung viewport translate va scale]
    WIRES[drawWire cho moi wire]
    PREVIEW[drawPreviewWire]
    JUNCTION[computeJunctions va ve diem noi]
    COMPONENTS[drawComponent cho moi component]
    GHOST{Dang dat component?}
    DRAWG[Ve ghost component]
    CROSS{Dang dung wire tool?}
    DRAWC[Ve crosshair]
    RESTORE[Khoi phuc screen space]
    ZOOM[Ve chi bao zoom]
    END([Hoan tat frame])

    START --> CLEAR --> TRANSFORM --> WIRES --> PREVIEW --> JUNCTION --> COMPONENTS --> GHOST
    GHOST -- Co --> DRAWG --> CROSS
    GHOST -- Khong --> CROSS
    CROSS -- Co --> DRAWC --> RESTORE
    CROSS -- Khong --> RESTORE
    RESTORE --> ZOOM --> END
```

`drawComponent()` dieu phoi cac ham ve:

```mermaid
flowchart LR
    DC[drawComponent]
    DC --> R[drawResistor]
    DC --> C[drawCapacitor]
    DC --> L[drawInductor]
    DC --> V[drawVoltageSource]
    DC --> I[drawCurrentSource]
    DC --> D[drawDiode]
    DC --> LED[drawLed]
    DC --> K[drawSwitch]
    DC --> BJT[drawBjt]
    DC --> MOS[drawMosfet]
    DC --> DEP[drawDependentSource]
    DC --> GND[drawGnd]
    DC --> PIN[Ve pin va label]
```

### 4.5 Hit-test va bien doi toa do Canvas

```mermaid
flowchart TD
    EVENT[Mouse event]
    SCREEN[getScreenXY]
    WORLD[screenToWorld]
    SEARCH{Muc dich}
    PIN[findPin]
    COMP[findComponent]
    WIRE[findWire]
    POINT[findPointOnWire]
    SEG[distSeg / pointOnSegment]
    RESULT[Tra doi tuong trung hoac null]

    EVENT --> SCREEN --> WORLD --> SEARCH
    SEARCH --> PIN --> RESULT
    SEARCH --> COMP --> RESULT
    SEARCH --> WIRE --> SEG --> RESULT
    SEARCH --> POINT --> SEG --> RESULT
```

### 4.6 Pan va Zoom trong `useViewport()`

```mermaid
flowchart TD
    ACTION{Thao tac}
    BP[beginPan: luu diem dau va viewport goc]
    CP[continuePan: tinh dx dy va cap nhat offset]
    EP[endPan: dung pan]
    ZA[zoomAt]
    WP[screenToWorld pivot]
    NS[Gioi han newScale tu 0.1 den 8]
    NO[Tinh offset moi de diem duoi con tro khong di chuyen]
    RESET[resetViewport]

    ACTION -- Mouse down --> BP
    ACTION -- Mouse move --> CP
    ACTION -- Mouse up --> EP
    ACTION -- Scroll --> ZA --> WP --> NS --> NO
    ACTION -- Ctrl+0 --> RESET
```

### 4.7 Autosave va quan ly nhieu file mach

```mermaid
flowchart TD
    CHANGE[components / wires / simConfig thay doi]
    READY{storageReady va co activeCircuitId?}
    DOC[Tao StoredCircuit moi]
    WAIT[Cho debounce 350 ms]
    SAVE[saveCircuit]
    DB[openDb -> tx put]
    ACTIVE[Luu activeCircuitId vao localStorage]
    LIST[updateCircuitList]
    STATUS[Saving -> Saved]

    CHANGE --> READY
    READY -- Khong --> STOP([Dung])
    READY -- Co --> DOC --> WAIT --> SAVE --> DB --> ACTIVE --> LIST --> STATUS
```

### 4.8 `WaveformPanel` dung du lieu mo phong

```mermaid
flowchart TD
    RESULT[SimulationResult]
    NODES[voltageNodes]
    SELECT[Chon mot hoac nhieu node]
    TYPE{analysis_type}
    OP[Bar chart dien ap node]
    TRAN[Truc X = time]
    DC{DC mode}
    SWEEP[Truc X = sweep value]
    XY[Truc X = node X; truc Y = node Y]
    AC[Hai do thi: magnitude dB va phase degree]
    PLOT[Plotly.react]

    RESULT --> NODES --> SELECT --> TYPE
    TYPE -- OP --> OP --> PLOT
    TYPE -- TRAN --> TRAN --> PLOT
    TYPE -- DC --> DC
    DC -- Sweep --> SWEEP --> PLOT
    DC -- Y-X --> XY --> PLOT
    TYPE -- AC --> AC --> PLOT
```

### 4.9 `PropertiesPanel`

```mermaid
flowchart TD
    SELECT[Component duoc chon]
    TYPE{Loai component}
    BASIC[Cap nhat value]
    SOURCE[Cap nhat DC / AC / PULSE / SIN]
    DEP[Cap nhat Vctrl / Gain]
    SWITCH[Cap nhat Open / Closed]
    LED[Cap nhat mau LED]
    TRANS[Cap nhat N/P, gm, output resistance]
    ROTATE[Rotate / Flip va updatePins]
    UPDATE[onUpdate -> App.updateComponent]
    SAVE[Autosave]

    SELECT --> TYPE
    TYPE --> BASIC --> UPDATE
    TYPE --> SOURCE --> UPDATE
    TYPE --> DEP --> UPDATE
    TYPE --> SWITCH --> UPDATE
    TYPE --> LED --> UPDATE
    TYPE --> TRANS --> UPDATE
    TYPE --> ROTATE --> UPDATE
    UPDATE --> SAVE
```

---

## 5. Kien truc du lieu

```mermaid
classDiagram
    class CircuitDocument {
      id: string
      name: string
      components: CircuitComponent[]
      wires: Wire[]
      simConfig: SimConfig
      createdAt: number
      updatedAt: number
    }

    class CircuitComponent {
      uuid: string
      id: string
      type: ComponentType
      x: number
      y: number
      rotation: 0|90|180|270
      value: string
      pins: Pin[]
      source: SourceConfig
      dependent: DependentSourceConfig
      switch: SwitchConfig
      led: LedConfig
      transistor: TransistorConfig
    }

    class Wire {
      id: string
      points: Point[]
    }

    class SimulationResult {
      success: boolean
      analysis_type: op|dc|ac|tran
      data: DataPoint[]
      error_msg: string
    }

    CircuitDocument "1" *-- "*" CircuitComponent
    CircuitDocument "1" *-- "*" Wire
    CircuitDocument --> SimConfig
    CircuitComponent "1" *-- "*" Pin
    SimulationResult "1" *-- "*" DataPoint
```

## 6. Luu y ve mo hinh BJT va MOSFET hien tai

BJT va MOSFET dang duoc bien dich thanh mo hinh tuyen tinh ma solver hien tai ho tro:

```text
Iout = gm * Vcontrol
```

Netlist gom mot VCCS va mot dien tro dau ra:

```text
GQ1 collector emitter base emitter gm
RQ1 collector emitter outputResistance
```

Mo hinh nay hoat dong voi OP, DC, AC va TRAN, nhung chua mo phong phi tuyen nhu threshold, cutoff, saturation hoac SPICE transistor model day du.

---

## 7. Ban do ham chi tiet

### `App.tsx`

| Ham | Duoc goi khi | Ket qua |
|---|---|---|
| `log` | Qua trinh mo phong | Them dong vao Console |
| `updateComponent` | Properties thay doi | Cap nhat component dang chon |
| `loadCircuit` | Khoi dong hoac chuyen file | Nap components, wires va simConfig |
| `updateCircuitList` | Sau khi luu | Dua file vua sua len dau danh sach |
| `createNewCircuit` | Nhan nut `+` | Tao va mo file mach moi |
| `renameCurrentCircuit` | Nhan nut `Aa` | Doi ten file hien tai |
| `deleteCurrentCircuit` | Nhan nut xoa file | Xoa file va chuyen sang file con lai |
| `forceSaveCircuit` | Nhan nut Save | Luu file ngay lap tuc |
| `deleteSelectedComponent` | Properties xoa component | Xoa component dang chon |
| `clearSchematic` | Nhan Clear | Xoa schematic va ket qua |
| `startVerticalResize` | Keo Console | Cap nhat chieu cao Console |
| `startHorizontalResize` | Keo Waveform | Cap nhat chieu rong Waveform |
| `runSimulation` | Nhan Run | Sinh netlist, goi solver va hien thi ket qua |

### `Canvas.tsx`

| Nhom ham | Ham | Trach nhiem |
|---|---|---|
| Khoi tao | `snap`, `updatePins`, `defaultValue`, `defaultSource`, `defaultDependent`, `defaultSwitch`, `defaultLed`, `defaultTransistor` | Tao du lieu mac dinh va toa do chan |
| Nhan dang | `componentLabel`, `distSeg`, `pointOnSegment` | Tao label va tinh khoang cach hinh hoc |
| Toa do | `getScreenXY`, `toWorld` | Chuyen toa do mouse sang schematic |
| Ket noi | `computeJunctions` | Tim cac diem noi can ve junction |
| Ve linh kien | `drawGnd`, `drawResistor`, `drawVoltageSource`, `drawCurrentSource`, `drawCapacitor`, `drawInductor`, `drawDiode`, `drawLed`, `drawSwitch`, `drawBjt`, `drawMosfet`, `drawDependentSource` | Ve tung ky hieu schematic |
| Ve tong hop | `drawComponent`, `drawWire`, `drawPreviewWire`, `render` | Ve mot frame canvas hoan chinh |
| Hit-test | `findPin`, `findComponent`, `findWire`, `findPointOnWire` | Tim doi tuong duoi con tro |
| Su kien | `handleMouseDown`, `handleMouseMove`, `handleMouseUp`, `handleWheel`, `handleKeyDown` | Xu ly thao tac nguoi dung |
| Bien doi | `rotateSelectedComponent`, `flipSelectedComponent`, `deleteSelectedComponent` | Bien doi component dang chon |

### `netlist.ts`

| Ham | Trach nhiem |
|---|---|
| `ptKey` | Bien toa do thanh khoa Union-Find |
| `distToSegment` | Kiem tra pin/point co nam tren wire |
| `sourceExpression` | Bien SourceConfig thanh cu phap DC, AC, PULSE hoac SIN |
| `ledModelName` | Tao ten model LED theo mau |
| `ledModelLine` | Tao khai bao `.model` LED |
| `generateNetlist` | Xac dinh node va bien schematic thanh netlist |
| `getNode` | Noi bo trong `generateNetlist`, anh xa pin sang node name |

### `circuitStorage.ts`

| Ham | Trach nhiem |
|---|---|
| `openDb` | Mo hoac khoi tao IndexedDB |
| `tx` | Boc mot thao tac transaction |
| `listCircuits` | Doc va sap xep cac file mach |
| `saveCircuit` | Them/cap nhat file mach |
| `deleteCircuit` | Xoa file mach |
| `createCircuit` | Tao document mach moi |
| `getActiveCircuitId` | Doc file dang mo tu localStorage |

### `circuitEngine.ts`

| Ham / lop | Trach nhiem |
|---|---|
| `loadEngine` | Tai JavaScript glue va WASM solver |
| `getEngine` | Tra singleton engine |
| `CircuitEngine.simulate` | Gui netlist vao WASM va parse JSON |
| `CircuitEngine.voltages` | Lay dien ap OP |
| `CircuitEngine.currents` | Lay dong nhanh OP |
| `CircuitEngine.tranSeries` | Lay chuoi du lieu theo thoi gian |
| `CircuitEngine.acBode` | Tinh magnitude dB va phase |

### Cac module giao dien khac

| Module | Ham chinh | Trach nhiem |
|---|---|---|
| `Toolbar.tsx` | `openModal`, `apply`, `set` | Chinh analysis mode va dieu khien chuong trinh |
| `Sidebar.tsx` | `ToolIcon`, `toggle`, `choose` | Chon component tu thanh nhanh hoac library |
| `PropertiesPanel.tsx` | `update`, `updateSource`, `updateDependent`, `updateSwitch`, `updateLedColor`, `updateTransistor`, `rotate`, `flipX`, `flipY` | Chinh thuoc tinh component |
| `WaveformPanel.tsx` | `voltageNodes` va effect dung Plotly | Chon node va ve cac loai waveform |
| `useViewport.ts` | `screenToWorld`, `worldToScreen`, `beginPan`, `continuePan`, `endPan`, `zoomAt`, `resetViewport` | Quan ly camera schematic |
| `unionFind.ts` | `find`, `union` | Gom cac diem noi thanh cung mot node dien |
