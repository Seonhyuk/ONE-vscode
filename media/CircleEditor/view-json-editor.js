var jsonEditor = jsonEditor || {};

jsonEditor.jsonEditor = class {

  constructor(host, id) {
    this._host = host;
    this._id = id ? ('-' + id) : '';
    this._closeJsonEditorHandler = () => {
      this.close();
    };
    this._closeJsonEditorKeyDownHandler = (e) => {
      if (e.keyCode === 27) {
        e.preventDefault();
        this.close();
      }
    };

    this._applyEditHandler = async (e) => {
      e.preventDefault();
      const value = this._host.document.getElementById('json-editor-content');
      const data = value.value;
      // TODO 마지막 textarea 값 적용하기
      let selected;

      switch (this._content._selectedButton) {
        case 0:
          selected = 'options';
          break;
        case 1:
          selected = 'subgraphs';
          break;
        case 2:
          selected = 'buffers';
          break;
      }

      await vscode.postMessage({
        command: 'updateJson',
        type: 'partOfModel',
        part: selected,
        data: data,
      });

      await vscode.postMessage({
        command: 'applyJsonToModel', 
      });

      this._host._view._jsonEditorOpened = false;
    };
  }

  open() {
    this.close();
    // vscode.postMessage({
    //   command: 'openJsonEditor'
    // });
    this._activate();
  }

  close() {
    this._deactivate();
    this._hide();
  }

  _hide() {
    const jsonEditor = this._host.document.getElementById('json-editor');
    if (jsonEditor) {
      while (jsonEditor.childElementCount > 0) {
        jsonEditor.removeChild(jsonEditor.lastChild);
      }

      jsonEditor.style.width = '0px';
    }
    const container = this._host.document.getElementById('graph');
    if (container) {
      container.style.width = '100%';
      container.focus();
    }
  }

  _setIndexInfo(data) {
    this._maxSubgraphIndex = data.subgraphLen;
    this._maxBufferIndex = data.bufferLen;
    this._activate();
  }

  _deactivate() {
    const jsonEditor = this._host.document.getElementById('json-editor');
    if (jsonEditor) {
      const closeButton = this._host.document.getElementById('json-editor-closebutton');
      if (closeButton) {
        closeButton.removeEventListener('click', this._closeJsonEditorHandler);
        closeButton.style.color = '#f8f8f8';
      }
      const applyButton = this._host.document.getElementById('json-editor-applybutton');
      if (applyButton) {
        applyButton.removeEventListener('click', this._applyEditHandler);
      }
      this._host.document.removeEventListener('keydown', this._closeJsonEditorKeyDownHandler);
    }
  }

  _activate() {
    const jsonEditorBox = this._host.document.getElementById('json-editor');
    if (jsonEditorBox) {
      jsonEditorBox.innerHTML = '';

      // 상단 타이틀 및 적용 닫기 버튼 부
      const closeButton = this.makeCloseButton();
      const applyButton = this.makeApplyButton();
      const title = this.makeTitle();

      title.appendChild(applyButton);
      title.appendChild(closeButton);

			jsonEditorBox.appendChild(title);
      
      // 중간 편집기 부분
      this.content = new jsonEditor.content(this._host);
      jsonEditorBox.appendChild(this.content.render());

      jsonEditorBox.style.width = 'min(calc(100% * 0.6), 800px)';
      this._host.document.addEventListener('keydown', this._closeJsonEditorKeyDownHandler);

      // 계산기 부분
      const calculatorBox = new jsonEditor.Calculator(this._host).render();
      jsonEditorBox.appendChild(calculatorBox[0]);
    }
    const container = this._host.document.getElementById('graph');
    if (container) {
      container.style.width = 'max(40vw, calc(100vw - 800px))';
    }

    vscode.postMessage({
      command: 'loadJson',
      type: 'partOfModel',
      part: 'options'
    });
  }

  makeCloseButton() {
    const closeButton = this._host.document.createElement('a');
    closeButton.classList.add('json-editor-closebutton');
    closeButton.setAttribute('id', 'json-editor-closebutton');
    closeButton.setAttribute('href', 'javascript:void(0)');
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', this._closeJsonEditorHandler);
    
    return closeButton;
  }

  makeApplyButton() {
    const applyButton = this._host.document.createElement('button');
    applyButton.classList.add('json-editor-applybutton');
    applyButton.setAttribute('id', 'json-editor-applybutton');
    applyButton.addEventListener('click', this._applyEditHandler);
    applyButton.innerHTML = 'apply';

    return applyButton;
  }

  makeTitle() {
    const title = this._host.document.createElement('div');
    title.classList.add('json-editor-title');

    const titleText = this._host.document.createElement('p');
    titleText.classList.add('json-editor-title-text');
    titleText.innerHTML = 'JSON Editor';
    title.appendChild(titleText);

    return title;
  }
};

jsonEditor.content = class {
  constructor(host, item) {
    this._host = host;
    this._item = item;
    this._elements = [];

    this._selectedButton = 0;

    this._tabEvent = (value) => {
      event.preventDefault();
      if (event.keyCode === 9) {
        const tab = '\t';
        value.selection = this._host.document.selection.createRange();
        value.selection.text = tab;
        event.returnValue = false;
      }
    };

    this.editor = host.document.createElement('div');
		this.editor.setAttribute('id', 'editor-box');

    // 상단 버튼부
		const buttonArea = host.document.createElement('div');
    buttonArea.classList.add('btn-area');

    this.tabButtons = [
      new jsonEditor.tabButton(this._host, 'options'),
      new jsonEditor.tabButton(this._host, 'subgraphs'),
      new jsonEditor.tabButton(this._host, 'buffers'),
    ];

    this.tabButtons[0].activate();

		this.tabButtons.forEach((tabButton, index) => {
      const renderedButton = tabButton.render();
      renderedButton.addEventListener('click', () => {
        this.changeSelect(index);
      });
      buttonArea.appendChild(renderedButton);
    });
    
    // 편집부
		this.editJsonArea = host.document.createElement('textarea');
    this.editJsonArea.setAttribute('id', 'edit-area');
		this.editJsonArea.classList.add('edit-area');

    //하단 페이지 선택부
    this.editor.append(buttonArea, this.editJsonArea);

    this._elements.push(this.editor);
  }

  setTextArea(data) {
    this.editJsonArea.setAttribute('value', data);
  }

  render() {
    return this._elements[0];
  }

  changeSelect(num) {
    if (this._selectedButton !== num) {
      this._selectedButton = num;
      this.tabButtons.forEach(tabButton => {
        tabButton.deactivate();
      });
      this.tabButtons[num].activate();

      if (this._selectedButton === 2) {
        const pageSelectArea = this.makeDetailPageSelectArea();
        this.editor.appendChild(pageSelectArea);
      }
    }
  }

  deactivate() {
    this.optionsButton.removeEventListener('click', this.selectArea);
    this.subgraphsButton.removeEventListener('click', this.selectArea);
    this.buffersButton.removeEventListener('click', this.selectArea);
  }

  makeDetailPageSelectArea() {
		const moveButton = this._host.document.createElement('button');
		moveButton.classList.add('page-move');
		moveButton.innerHTML = 'move';
		const addButton = this._host.document.createElement('button');
		addButton.classList.add('page-move');
		addButton.innerHTML = 'add';

		const selectedEditArea = this._host.document.createElement('div');
		selectedEditArea.classList.add('detail-page-select');

		const pageInput = this._host.document.createElement('input');
    pageInput.classList.add('page-input');
    pageInput.setAttribute('id', 'page-input');
		pageInput.setAttribute('type', 'text');
		pageInput.setAttribute('value', '1');

		const totalPage = this._host.document.createElement('span');
    totalPage.setAttribute('id', 'entire-page');
		totalPage.innerHTML = '/0';

		selectedEditArea.appendChild(pageInput);
		selectedEditArea.appendChild(totalPage);
    selectedEditArea.appendChild(moveButton);
		selectedEditArea.appendChild(addButton);

		return selectedEditArea;
  }
};

jsonEditor.tabButton = class {
  constructor(host, tabName) {
    this._host = host;
    this._tabName = tabName;
    this._element = this.makeTabButton();
  }

  makeTabButton() {
		const tabButton = this._host.document.createElement('div');
		tabButton.classList.add('tab');
		const tabButtonTitle = this._host.document.createElement('span');
		tabButtonTitle.innerHTML = this._tabName;
		tabButton.appendChild(tabButtonTitle);

    return tabButton;
  }

  activate() {
    this.makePageSelectArea();
    this._element.classList.add('select');

    vscode.postMessage({
      command: 'loadJson', 
      type: 'partOfModel', 
      part: this._tabName,
      currentIdx: 1,
      pageIdx: 1,
    });
  }

  getPage() {
    const currentInput = this._host.document.getElementById('page-input');
    const currentIdx = currentInput.innerText;

    vscode.postMessage({
      command: 'loadJson', 
      type: 'partOfModel', 
      part: this._tabName,
      currentIdx: number(currentIdx),
      pageIdx: 1,
    });
  }

  deactivate() {
    if (this._element.childElementCount > 1) {
      this._element.removeChild(this._element.lastChild);
      this._element.classList.remove('select');
    }
  }

  setPage(pageNum, entirePageNum) {
    const pageInput = this._host.document.getElementById('page-input');
    pageInput.setAttribute('value', pageNum);

    const totalPage = this._host.document.getElementById('entire-page');
    totalPage.innerText = entirePageNum;
  }

  movePage() {
    const pageNum = this._host.documnet.getElementById('page-input');
    vscode.postMessage({
      command: 'loadJson',
      type: 'partOfModel',
      part: this._tabName,
      pageIdx: pageNum,
    });
  }

  makePageSelectArea() {
		const moveButton = this._host.document.createElement('button');
		moveButton.classList.add('page-move');
		moveButton.innerHTML = 'move';
		const addButton = this._host.document.createElement('button');
		addButton.classList.add('page-move');
		addButton.innerHTML = 'add';

		const selectedEditArea = this._host.document.createElement('div');
		selectedEditArea.classList.add('page-select');

		const pageInput = this._host.document.createElement('input');
    pageInput.classList.add('page-input');
    pageInput.setAttribute('id', 'page-input');
		pageInput.setAttribute('type', 'text');
		pageInput.setAttribute('value', '1');

		const totalPage = this._host.document.createElement('span');
    totalPage.setAttribute('id', 'entire-page');
		totalPage.innerHTML = '/0';

		selectedEditArea.appendChild(pageInput);
		selectedEditArea.appendChild(totalPage);
    selectedEditArea.appendChild(moveButton);
		selectedEditArea.appendChild(addButton);

		this._element.appendChild(selectedEditArea);
  }

  deletePageSelectArea() {

  }

  render() {
    return this._element;
  }
};

jsonEditor.Calculator = class {
  constructor(host) {
    this._host = host;
    this._elements = [];

    this._editObject = {};
    
    this._calculatorBox = this.makeTag('div', 'calculator-box');
    this._toggle = this.makeTag('div', 'toggle-button');

    this._buttonArea = this.makeTag('div', 'button-area');
    this._bufferButton = this.makeTag('div', 'button');
    this._customOptionsButton = this.makeTag('div', 'button');
    
    const calculatorNameBox = this.makeTag('div', 'calculator-name-box');
    const calculatorName = this.makeTag('div', 'calculator-name');
    
    this._toggle.innerText = '+';
    calculatorName.innerText = 'Calculator';

    this._calculatorBox.appendChild(calculatorNameBox);
    calculatorNameBox.appendChild(calculatorName);
    calculatorNameBox.appendChild(this._toggle);

    this._bufferButton.innerText = 'Buffer';
    this._customOptionsButton.innerText = 'Custom';

    this._buttonArea.appendChild(this._bufferButton);
    this._buttonArea.appendChild(this._customOptionsButton);

    this._toggle.addEventListener('click', () => {
      this.toggle();
    });

    this._elements.push(this._calculatorBox);
  }

  toggle() {
    if(this._toggle.innerText === '+') {
      this._toggle.innerText = '-';
      this._calculatorBox.appendChild(this._buttonArea);

      const editBox = this._host.document.getElementById('editor-box');
      editBox.style.height = 'calc(65% - 60px)';
      this._calculatorBox.style.height = 'calc(35% + 30px)';
      
      this.buffer();

      this._bufferButton.addEventListener('click', () => {
        this.buffer();
      });

      this._customOptionsButton.addEventListener('click', () => {
        this.customOptions();
      });
    } else {
      this._toggle.innerText = '+';
      this._calculatorBox.removeChild(this._buttonArea);

      const editBox = this._host.document.getElementById('editor-box');
      editBox.style.height = 'calc(100% - 60px)';

      this._calculatorBox.style.height = "30px";
			
			while (this._calculatorBox.childElementCount > 1) {
				this._calculatorBox.removeChild(this._calculatorBox.lastChild);
			}
		}
  }

  buffer() {
    while (this._elements[0].childElementCount > 2) {
      this._elements[0].removeChild(this._elements[0].lastChild);
    }
    this._bufferButton.className = 'button-selected';
    this._customOptionsButton.className = 'button';
    const expanderArea = this.makeTag('div', 'expander-area');
    const titleArea = this.makeTag('div', 'title-area');
    const inputTitle = this.makeTag('div', 'title');
    const convert = this.makeTag('div', 'convert-button');
    const inputArea = this.makeTag('div', 'input-area');
    const valueArea = this.makeTag('div', 'value-area');
    const typeArea = this.makeTag('div', 'type-area');
    const valueTitle = this.makeTag('div', 'input-title');
    const typeTitle = this.makeTag('div', 'input-title');
    this._input = this.makeTag('input', 'input');
    this._select = this.makeTag('select', 'select');
    const outputArea = this.makeTag('div', 'output-area');
    const outputTitle = this.makeTag('div', 'output-title');
    const outputLine = this.makeTag('div', 'output-line');
    const clear = this.makeTag('div', 'clear-button');
    this._output = this.makeTag('input', 'output');
    const copy = this.makeTag('div', 'copy-button');
    convert.innerText = 'Convert';
    clear.innerText = 'Clear';
    inputTitle.innerText = 'Input ';
    outputTitle.innerText = 'Output ';
    copy.innerText = '📋️';
    valueTitle.innerText = 'Value';
    typeTitle.innerText = 'Type';
    
    titleArea.appendChild(inputTitle);
    titleArea.appendChild(convert);
    expanderArea.appendChild(titleArea);
    valueArea.appendChild(valueTitle);
    valueArea.appendChild(this._input);
    typeArea.appendChild(typeTitle);
    typeArea.appendChild(this._select);
    inputArea.appendChild(valueArea);
    inputArea.appendChild(typeArea);
    expanderArea.appendChild(inputArea);
    outputArea.appendChild(outputTitle);
    outputLine.appendChild(this._output);
    outputLine.appendChild(copy);
    outputLine.appendChild(clear);
    outputArea.appendChild(outputLine);
    this._calculatorBox.appendChild(expanderArea);
    this._calculatorBox.appendChild(outputArea);

    this._output.setAttribute('readonly', 'true');

    convert.addEventListener('click', () => {
      this.bufferConvert();
    });

    clear.addEventListener('click', () => {
      this.bufferClear();
    });

    copy.addEventListener('click', () => {
      this.bufferCopy();
    });

    for(const type of tensorType){
      const option = this._host.document.createElement('option');
      option.setAttribute('value', type);
      option.innerText = type.toLowerCase();

      this._select.appendChild(option);
    }
  }

  customOptions() {
    while (this._elements[0].childElementCount > 2) {
      this._elements[0].removeChild(this._elements[0].lastChild);
    }
    this._bufferButton.className = 'button';
    this._customOptionsButton.className = 'button-selected';
    const expanderArea = this.makeTag('div', 'expander-area');
    const titleArea = this.makeTag('div', 'title-area');
    const inputTitle = this.makeTag('div', 'title');
    const convert = this.makeTag('div', 'convert-button');
    this._inputArea = this.makeTag('div', 'custom-input-area');
    const inputTitleLine = this.makeTag('div', 'input-title-line');
    const keyTitle = this.makeTag('div', 'custom-input-title');
    const valueTitle = this.makeTag('div', 'custom-input-title');
    const typeTitle = this.makeTag('div', 'custom-select-title');
    const minus = this.makeTag('div', 'minus-button');
    const plus = this.makeTag('div', 'plus-button');
    const outputArea = this.makeTag('div', 'output-area');
    const outputTitle = this.makeTag('div', 'output-title');
    const outputLine = this.makeTag('div', 'output-line');
    const clear = this.makeTag('div', 'clear-button');
    this._customOutput = this.makeTag('input', 'output');
    this._customOutput.setAttribute('id', 'output');
    const copy = this.makeTag('div', 'copy-button');
    minus.setAttribute('style', 'visibility: hidden');

    convert.innerText = 'Convert';
    inputTitle.innerText = 'Input ';
    keyTitle.innerText = 'Key';
    valueTitle.innerText = 'Value';
    typeTitle.innerText = 'Type';
    clear.innerText = 'Clear';
    outputTitle.innerText = 'Output ';
    minus.innerText = '-';
    copy.innerText = '📋️';

    this._customOutput.setAttribute('readonly', 'true');
    plus.innerText = '+ New Attributes';

    convert.addEventListener('click', () => {
      this.customOptionsConvert();
    });
    clear.addEventListener('click', () => {
      this.customOptions();
    });
    plus.addEventListener('click', () => {
      this._inputArea.appendChild(this.makeLine());
    });
    copy.addEventListener('click', () => {
      this.customOptionsCopy();
    });
    
    expanderArea.appendChild(this._inputArea);
    this._calculatorBox.appendChild(expanderArea);
    
    titleArea.appendChild(inputTitle);
    titleArea.appendChild(convert);
    expanderArea.appendChild(titleArea);
    inputTitleLine.appendChild(keyTitle);
    inputTitleLine.appendChild(valueTitle);
    inputTitleLine.appendChild(typeTitle);
    inputTitleLine.appendChild(minus);
    this._inputArea.appendChild(inputTitleLine);
    expanderArea.appendChild(this._inputArea);
    outputArea.appendChild(outputTitle);
    outputLine.appendChild(this._customOutput);
    outputLine.appendChild(copy);
    outputLine.appendChild(clear);
    outputArea.appendChild(outputLine);
    this._calculatorBox.appendChild(outputArea);
    
    expanderArea.appendChild(plus);
    this._inputArea.appendChild(this.makeLine());
  }

  makeLine() {
    const inputLine = this.makeTag('div', 'input-line');
    const key = this.makeTag('input', 'custom-input');
    const value = this.makeTag('input', 'custom-input');
    const select = this.makeTag('select', 'custom-select');
    const minus = this.makeTag('div', 'minus-button');
    minus.innerText = '-';

    for(const type of customType){
      const option = this._host.document.createElement('option');
      option.setAttribute('value', type);
      option.innerText = type.toLowerCase();

      select.appendChild(option);
    }

    minus.addEventListener('click', () => {
      this._inputArea.removeChild(inputLine);
    });
    
    inputLine.appendChild(key);
    inputLine.appendChild(value);
    inputLine.appendChild(select);
    inputLine.appendChild(minus);

    return inputLine;
  }

  bufferConvert() {
    this._output.value = new jsonEditor.Converter(this._input.value, this._select.value).render();
  }

  customOptionsConvert() {
    this._editObject = new Object;
    for(let i = 1 ; i < this._inputArea.childElementCount ; i++){
      const key = this._inputArea.childNodes[i].childNodes[0].value;
      const value = this._inputArea.childNodes[i].childNodes[1].value;
      const type = this._inputArea.childNodes[i].childNodes[2].value;
      if(key && value) {
        this._editObject[key] = [value, type];
      } else {
        vscode.postMessage({
          command: 'alert',
          text: 'FORMAT ERROR : Please enter key and value.'
        });
        return;
      }
    }

    vscode.postMessage({
      command: 'requestEncodingData',
      data : this._editObject
    });
  }

  bufferClear() {
    this._input.value = '';
    this._output.value = '';
  }

  bufferCopy() {
    this._output.select();
    document.execCommand('copy');
    this._output.setSelectionRange(0, 0);
  }

  customOptionsCopy() {
    this._customOutput.select();
    document.execCommand('copy');
    this._customOutput.setSelectionRange(0, 0);
  }

  makeTag(tag, className) {
    const temp = this._host.document.createElement(tag);
    if (className) {
      temp.className = className;
    }

    return temp;
  }

  render() {
    return this._elements;
  }
};

jsonEditor.Converter = class {

  constructor(str, type) {
    this._str = str;
    this._type = type;

    this.calc();
  }

  calc() {
    const types = ['float32', 'float16', 'int32', 'uint8', 'int64', 'string', 'bool', 'int16', 'complex64', 'int8', 'float64', 'complex128', 'uint64', 'resource', 'variant', 'uint32'];
        
    // 0:float, 1:int, 2:uint, 3:string, 4:boolean, 5:complex, 6:resource, 7:variant
    this._bits = [32, 16, 32, 8, 64, 0, 8, 16, 64, 8, 64, 128, 64, 0, 0, 32];
        
    this._typeIndex = types.indexOf(this._type.toLowerCase());
        
    this._arr = this._str.split(',');
    this._result = "";
    if (this._type.toLowerCase() === 'bool') {
      for (let i = 0; i < this._arr.length; i++) {
        if (this._arr[i].trim().toLowerCase() === 'true') {
          this._result += "1, ";
        } else if (this._arr[i].trim().toLowerCase() === 'false') {
          this._result += "0, ";
        } else {
          return this._result = "ERROR: Please enter in 'true' or 'false' format for boolean type.";
        }
      }
      this._result = this._result.slice(0, -2);
      return this._result;
    } else {
      for (let i = 0; i < this._arr.length; i++) {
        if (!/^[0-9\\.\-\\/]+$/.test(this._arr[i].trim())) { return this._result = "ERROR: Please enter digits and decimal points only."; }
        let v = this.calculate(parseFloat(this._arr[i]), this._typeIndex, this._bits[this._typeIndex] / 8);
        if (!v) {
          return this._result = "ERROR: Data does not match type.";
        } else {
          for (let j = 0; j < v.byteLength; j++) {
            this._result += v.getUint8(j) + ", ";
          }
        }
      }
      this._result = this._result.slice(0, -2);
      return this._result;
    }
  }

  calculate(num, c, b) {

    var buffer = new ArrayBuffer(b);
    var view = new DataView(buffer);

    switch (c) {
      case 0:
        view.setFloat32(0, num, true);
        break;
      case 1:
        view.setFloat16(0, num, true);
        break;
      case 2:
        view.setInt32(0, num, true);
        break;
      case 3:
        if(num < 0) { return; }
        view.setUint8(0, num, true);
        break;
      case 4:
        view.setBigInt64(0, BigInt(parseInt(String(num))), true);
        break;
      case 5:
        break;
      case 6:
        view.setInt32(0, num, true);
        break;
      case 7:
        view.setInt16(0, num, true);
        break;
      case 8:
        break;
      case 9:
        view.setInt8(0, num, true);
        break;
      case 10:
        view.setFloat64(0, num, true);
        break;
      case 11:
        break;
      case 12:
        if(num < 0) { return; }
        view.setBigUint64(0, BigInt(parseInt(String(num))), true);
        break;
      case 13:
        break;
      case 14:
        break;
      case 15:
        if(num < 0) { return; }
        view.setUint32(0, num, true);
        break;
    }

    return view;
  }

  render() {
    return this._result;
  }
};
