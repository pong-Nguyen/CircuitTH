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

---

## 8. Kien truc Circuit Engine

### 8.1 Vi tri cua engine trong he thong

```mermaid
flowchart LR
    SC[Schematic State]
    NG[Netlist Generator]
    APP[App.runSimulation]

    subgraph WRAPPER["TypeScript Engine Wrapper"]
        GE[getEngine]
        LE[loadEngine]
        CE[CircuitEngine.simulate]
        HELP[voltages / currents / tranSeries / acBode]
    end

    subgraph WASM_PACKAGE["Emscripten WASM Package"]
        JS[circuit_engine.js]
        WM[circuit_engine.wasm]
        API[simulate netlist -> JSON string]
    end

    RES[SimulationResult]
    UI[Console + Waveform]

    SC --> NG --> APP --> GE
    GE --> LE --> JS --> WM
    GE --> CE --> API
    API --> RES
    RES --> HELP
    RES --> UI
```

Engine chay hoan toan trong trinh duyet. Trinh duyet khong gui netlist den server, do do viec mo phong van hoat dong sau khi trang va hai file WASM da duoc tai.

### 8.2 Hop dong API giua React va WASM

Frontend chi su dung mot ham cua WASM:

```ts
simulate(netlist: string): string
```

Du lieu vao la netlist dang text. Du lieu tra ve la JSON string, sau do wrapper chuyen thanh:

```ts
interface SimulationResult {
  success: boolean;
  error_msg: string;
  analysis_type: 'op' | 'dc' | 'ac' | 'tran';
  node_map: Record<string, number>;
  data: DataPoint[];
}
```

Moi `DataPoint` dai dien cho mot diem operating point, sweep, tan so hoac thoi gian:

```mermaid
classDiagram
    class SimulationResult {
      success: boolean
      error_msg: string
      analysis_type: op|dc|ac|tran
      node_map: Record
      data: DataPoint[]
    }

    class DataPoint {
      sweep_type: operating_point|dc_sweep|frequency|time
      sweep_value: number
      values: NodeValue[]
    }

    class NodeValue {
      name: string
      type: voltage|current
      real: number
      imag: number
    }

    SimulationResult "1" *-- "*" DataPoint
    DataPoint "1" *-- "*" NodeValue
```

### 8.3 Flowchart nap engine

```mermaid
flowchart TD
    START([getEngine])
    SINGLE{Da co engine singleton?}
    RETURN[Tra engine hien tai]
    LOAD[loadEngine]
    PROMISE{Da co module promise?}
    SCRIPT[Tao script tag circuit_engine.js]
    WAIT[Cho script load]
    FACTORY[Lay window.CircuitEngineModule]
    LOCATE[Cau hinh locateFile cho circuit_engine.wasm]
    INIT[Khoi tao WASM module]
    WRAP[new CircuitEngine module]
    CACHE[Luu engine singleton]

    START --> SINGLE
    SINGLE -- Co --> RETURN
    SINGLE -- Khong --> LOAD --> PROMISE
    PROMISE -- Co --> WRAP
    PROMISE -- Khong --> SCRIPT --> WAIT --> FACTORY --> LOCATE --> INIT --> WRAP
    WRAP --> CACHE --> RETURN
```

`_modulePromise` ngan viec tai WASM trung lap. `_engineSingleton` dam bao moi lan Run deu tai su dung cung mot engine.

### 8.4 Flowchart goi mo phong

```mermaid
sequenceDiagram
    actor User
    participant Toolbar
    participant App
    participant Netlist as generateNetlist
    participant Wrapper as CircuitEngine.ts
    participant WASM as circuit_engine.wasm
    participant Waveform

    User->>Toolbar: Nhan Run
    Toolbar->>App: onRun()
    App->>Netlist: generateNetlist(components, wires)
    Netlist-->>App: SPICE-like netlist
    App->>App: Chen lenh .op/.dc/.ac/.tran
    App->>Wrapper: getEngine()
    Wrapper-->>App: CircuitEngine singleton
    App->>Wrapper: simulate(netlist)
    Wrapper->>WASM: mod.simulate(netlist)
    WASM-->>Wrapper: JSON string
    Wrapper-->>App: SimulationResult

    alt success = true
        App->>Waveform: result
        Waveform->>Waveform: Chuyen data thanh Plotly traces
    else success = false
        App->>App: Ghi error_msg vao Console
    end
```

### 8.5 Luong xu ly noi bo solver

> Luu y: source C++ cua engine khong nam trong project hien tai. Flowchart duoi day la mo hinh suy luan dua tren API, cu phap netlist duoc chap nhan va cac loi solver tra ve nhu `Singular matrix`. Khi co source engine, can doi chieu lai tung buoc.

```mermaid
flowchart TD
    START([simulate netlist])
    PARSE[Doc tung dong netlist]
    CLASSIFY{Loai dong}
    MODEL[Luu khai bao .model]
    ELEMENT[Tao danh sach phan tu mach]
    COMMAND[Luu lenh .op / .dc / .ac / .tran]
    NODES[Tao node map va bien nhanh]
    VALIDATE[Kiem tra model, node va tham so]
    VALID{Hop le?}
    ANALYSIS{Loai phan tich}
    OP[Giai operating point]
    DC[Quet nguon va giai tai moi diem]
    AC[Giai he so phuc tai moi tan so]
    TRAN[Tien theo tung buoc thoi gian]
    MATRIX[Lap he phuong trinh mach]
    SOLVE[Giai he tuyen tinh]
    CHECK{Ma tran giai duoc?}
    DATA[Tao DataPoint va NodeValue]
    JSON[Dong goi SimulationResult thanh JSON]
    ERROR[Tra success=false va error_msg]

    START --> PARSE --> CLASSIFY
    CLASSIFY -- Model --> MODEL --> PARSE
    CLASSIFY -- Element --> ELEMENT --> PARSE
    CLASSIFY -- Command --> COMMAND --> NODES
    NODES --> VALIDATE --> VALID
    VALID -- Khong --> ERROR
    VALID -- Co --> ANALYSIS

    ANALYSIS -- OP --> OP --> MATRIX
    ANALYSIS -- DC --> DC --> MATRIX
    ANALYSIS -- AC --> AC --> MATRIX
    ANALYSIS -- TRAN --> TRAN --> MATRIX

    MATRIX --> SOLVE --> CHECK
    CHECK -- Khong --> ERROR
    CHECK -- Co --> DATA
    DATA -->|Con diem sweep / tan so / thoi gian| MATRIX
    DATA -->|Hoan tat| JSON
```

### 8.6 Luong giai theo tung che do

#### Operating Point `.OP`

```mermaid
flowchart TD
    START([.OP])
    STAMP[Dong gop tung linh kien vao ma tran]
    SOLVE[Giai he phuong trinh]
    OK{Giai duoc?}
    VALUES[Lay dien ap node va dong nhanh]
    RESULT[Tra mot DataPoint operating_point]
    ERROR[Tra loi singular matrix / model / parser]

    START --> STAMP --> SOLVE --> OK
    OK -- Co --> VALUES --> RESULT
    OK -- Khong --> ERROR
```

#### DC Sweep `.DC`

```mermaid
flowchart TD
    START([.DC source start stop step])
    VALUE[Dat gia tri nguon sweep]
    STAMP[Lap lai he phuong trinh]
    SOLVE[Giai tai diem sweep hien tai]
    SAVE[Luu DataPoint dc_sweep]
    NEXT{Con gia tri sweep?}
    RESULT[Tra danh sach DataPoint]

    START --> VALUE --> STAMP --> SOLVE --> SAVE --> NEXT
    NEXT -- Co --> VALUE
    NEXT -- Khong --> RESULT
```

#### AC Analysis `.AC`

```mermaid
flowchart TD
    START([.AC scale points fstart fstop])
    FREQ[Tao danh sach tan so]
    SOURCE[Lay bien do va pha AC cua nguon]
    COMPLEX[Lap he phuong trinh so phuc tai tan so hien tai]
    SOLVE[Giai real va imaginary]
    SAVE[Luu DataPoint frequency]
    NEXT{Con tan so?}
    RESULT[Tra magnitude va phase thong qua NodeValue]

    START --> FREQ --> SOURCE --> COMPLEX --> SOLVE --> SAVE --> NEXT
    NEXT -- Co --> COMPLEX
    NEXT -- Khong --> RESULT
```

#### Transient Analysis `.TRAN`

```mermaid
flowchart TD
    START([.TRAN step stop])
    TIME[t = 0]
    SOURCES[Tinh nguon PULSE / SIN tai t]
    DYNAMIC[Cap nhat trang thai C va L]
    MATRIX[Lap he phuong trinh tai t]
    SOLVE[Giai dien ap va dong]
    SAVE[Luu DataPoint time]
    NEXT[t = t + step]
    DONE{t > stop?}
    RESULT[Tra chuoi du lieu thoi gian]

    START --> TIME --> SOURCES --> DYNAMIC --> MATRIX --> SOLVE --> SAVE --> NEXT --> DONE
    DONE -- Chua --> SOURCES
    DONE -- Roi --> RESULT
```

### 8.7 Anh xa linh kien giao dien sang phan tu engine

| Linh kien tren schematic | Netlist gui vao engine | Ghi chu |
|---|---|---|
| Resistor | `R... n1 n2 value` | Phan tu tuyen tinh |
| Capacitor | `C... n1 n2 value` | Phu thuoc tan so/thoi gian |
| Inductor | `L... n1 n2 value` | Phu thuoc tan so/thoi gian |
| Voltage Source | `V... n+ n- expression` | DC, AC, PULSE, SIN |
| Current Source | `I... n+ n- expression` | DC, AC, PULSE, SIN |
| VCVS | `E...` | Nguon ap phu thuoc ap |
| CCCS | `F...` | Nguon dong phu thuoc dong |
| VCCS | `G...` | Nguon dong phu thuoc ap |
| CCVS | `H...` | Nguon ap phu thuoc dong |
| Diode | `D... model` | Can khai bao `.model` truoc |
| LED | `D... Dled_color` | Duoc bien dich thanh diode model |
| Switch | `R... 1m` hoac `R... 1e12` | Mo hinh hoa bang dien tro |
| Ideal BJT | `G...` + `R...` | Bien dich thanh VCCS va output resistance |
| Ideal MOSFET | `G...` + `R...` | Bien dich thanh VCCS va output resistance |
| Ground | Node `0` | Khong sinh element line |

### 8.8 Xu ly ket qua engine

```mermaid
flowchart TD
    RES[SimulationResult]
    OK{success?}
    ERROR[Console hien error_msg]
    TYPE{analysis_type}
    OP[voltages + currents]
    DC[DC sweep hoac Y-X plot]
    AC[acBode: magnitude dB va phase]
    TRAN[tranSeries hoac waveform theo time]
    CONSOLE[In bang mau du lieu]
    PLOT[Plotly waveform]

    RES --> OK
    OK -- Khong --> ERROR
    OK -- Co --> TYPE
    TYPE -- op --> OP --> CONSOLE
    TYPE -- dc --> DC --> CONSOLE
    TYPE -- dc --> DC --> PLOT
    TYPE -- ac --> AC --> CONSOLE
    TYPE -- ac --> AC --> PLOT
    TYPE -- tran --> TRAN --> CONSOLE
    TYPE -- tran --> TRAN --> PLOT
```

### 8.9 Cac loai loi engine can xu ly

| Loi | Nguyen nhan thuong gap | Cach xu ly o giao dien |
|---|---|---|
| Unknown model | Linh kien tham chieu model chua khai bao | Sinh `.model` truoc element |
| Singular matrix | Node floating, mach ho, short nguon ly tuong | Dat GND, auto-reference hoac sua mach |
| Parse/model error | Netlist sai cu phap hoac tham so khong hop le | Hien `error_msg` trong Console |
| WASM load error | Khong tai duoc `.js` hoac `.wasm` | Bat exception tu `loadEngine` |
| Simulation exception | WASM call nem exception | Bat trong `runSimulation` va ghi Console |

### 8.10 Gioi han va huong nang cap engine

Engine hien tai la mot binary WASM dong goi san; project khong co source solver de sua truc tiep. Vi vay:

- Co the them linh kien moi bang cach bien dich sang cac phan tu engine da ho tro.
- Khong the bo sung model phi tuyen BJT/MOSFET day du neu khong co source engine hoac thay engine.
- BJT/MOSFET hien tai la mo hinh tuyen tinh `Iout = gm * Vcontrol`.
- Viec debug solver chi dua vao netlist vao va `error_msg` tra ve.

Kien truc de nang cap trong tuong lai:

```mermaid
flowchart LR
    APP[React App]
    PORT[SimulationEngine interface]
    CURRENT[Current WASM Adapter]
    NG[ngspice WASM Adapter]
    TEST[Engine Contract Tests]

    APP --> PORT
    PORT --> CURRENT
    PORT -. Lua chon nang cap .-> NG
    TEST --> PORT
```

Nen tao interface chung:

```ts
interface SimulationEngine {
  simulate(netlist: string): Promise<SimulationResult>;
}
```

Khi do co the thay solver hien tai bang ngspice WASM ma khong can sua Canvas, Properties, storage hoac Waveform.
