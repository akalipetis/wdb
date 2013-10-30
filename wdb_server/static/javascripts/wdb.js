// Generated by CoffeeScript 1.6.3
(function() {
  var $source, $traceback, ack, backsearch, breakset, breakunset, chilling, cls, cm, cm_theme, cmd_hist, code, create_code_mirror, cwd, die, display, dump, e, echo, ellipsize, execute, file_cache, format_fun, get_mode, historize, init, last_cmd, log, make_ws, print, print_help, print_hist, register_handlers, searchback, searchback_stop, select, select_check, send, session_cmd_hist, start, started, suggest, suggest_stop, termscroll, time, title, to_complete, toggle_break, toggle_edition, trace, waited_for_ws, watched, working, ws,
    _this = this,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __hasProp = {}.hasOwnProperty;

  time = function() {
    var d;
    d = new Date();
    return "" + (d.getHours()) + ":" + (d.getMinutes()) + ":" + (d.getSeconds()) + "." + (d.getMilliseconds());
  };

  cm = null;

  cm_theme = 'tomorrow-night';

  started = false;

  to_complete = null;

  ws = null;

  cwd = null;

  backsearch = null;

  cmd_hist = [];

  try {
    cmd_hist = JSON.parse(localStorage['cmd_hist']);
  } catch (_error) {
    e = _error;
    console.log(e);
  }

  session_cmd_hist = {};

  file_cache = {};

  waited_for_ws = 0;

  $source = null;

  $traceback = null;

  working = function() {
    return $('.state').addClass('on');
  };

  chilling = function() {
    return $('.state').removeClass('on');
  };

  send = function(msg) {
    console.log(time(), '->', msg);
    return ws.send(msg);
  };

  make_ws = function() {
    var new_ws, sck,
      _this = this;
    sck = "ws://" + document.location.hostname + ':1984/websocket/' + _uuid;
    console.log('Opening new socket', sck);
    new_ws = new WebSocket(sck);
    new_ws.onclose = function(m) {
      return console.log("WebSocket closed " + m);
    };
    new_ws.onerror = function(m) {
      return console.log("WebSocket error " + m);
    };
    new_ws.onopen = function(m) {
      console.log("WebSocket is open", m);
      if (!started) {
        register_handlers();
        started = true;
      }
      start();
      $('#waiter').remove();
      $('#wdb').show();
      return $('#eval').autosize();
    };
    new_ws.onmessage = function(m) {
      var cmd, data, message, pipe, treat;
      message = m.data;
      pipe = message.indexOf('|');
      if (pipe > -1) {
        cmd = message.substr(0, pipe);
        data = JSON.parse(message.substr(pipe + 1));
      } else {
        cmd = message;
      }
      console.log(time(), '<-', cmd);
      treat = (function() {
        switch (cmd) {
          case 'Init':
            return init;
          case 'Title':
            return title;
          case 'Trace':
            return trace;
          case 'Select':
            return select;
          case 'SelectCheck':
            return select_check;
          case 'Print':
            return print;
          case 'Echo':
            return echo;
          case 'BreakSet':
            return breakset;
          case 'BreakUnset':
            return breakunset;
          case 'Dump':
            return dump;
          case 'Display':
            return display;
          case 'Suggest':
            return suggest;
          case 'Watched':
            return watched;
          case 'Ack':
            return ack;
          case 'Log':
            return log;
          case 'Die':
            return die;
        }
      })();
      if (!treat) {
        return console.log('Unknown command', cmd);
      } else {
        return treat(data);
      }
    };
    return new_ws;
  };

  $(function() {
    setTimeout(function() {
      return $('#deactivate').click(function() {
        send('Disable');
        return false;
      });
    }, 250);
    return _this.ws = ws = make_ws();
  });

  start = function() {
    send('Start');
    $source = $('#source');
    return $traceback = $('#traceback');
  };

  init = function(data) {
    return cwd = data.cwd;
  };

  title = function(data) {
    return $('#title').text(data.title).attr('title', data.title).append($('<small>').text(data.subtitle).attr('title', data.subtitle));
  };

  trace = function(data) {
    var $tracecode, $tracefile, $tracefilelno, $tracefun, $tracefunfun, $traceline, $tracelno, frame, suffix, _i, _len, _ref;
    $traceback.empty();
    _ref = data.trace;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      frame = _ref[_i];
      $traceline = $('<div>').addClass('traceline').attr('id', 'trace-' + frame.level).attr('data-level', frame.level);
      if (frame.current) {
        $traceline.addClass('real-selected');
      }
      $tracefile = $('<span>').addClass('tracefile').text(frame.file);
      $tracelno = $('<span>').addClass('tracelno').text(frame.lno);
      $tracefun = $('<span>').addClass('tracefun').text(frame["function"]);
      $tracefilelno = $('<div>').addClass('tracefilelno').append($tracefile).append($tracelno);
      $tracefunfun = $('<div>').addClass('tracefunfun').append($tracefun);
      if (frame.file.indexOf('site-packages') > 0) {
        suffix = frame.file.split('site-packages').slice(-1)[0];
        $tracefile.text(suffix);
        $tracefile.prepend($('<span>').addClass('tracestar').text('*').attr({
          title: frame.file
        }));
      }
      if (frame.file.indexOf(cwd) === 0) {
        suffix = frame.file.split(cwd).slice(-1)[0];
        $tracefile.text(suffix);
        $tracefile.prepend($('<span>').addClass('tracestar').text('.').attr({
          title: frame.file
        }));
      }
      $tracecode = $('<div>').addClass('tracecode');
      code($tracecode, frame.code);
      $traceline.append($tracefilelno);
      $traceline.append($tracecode);
      $traceline.append($tracefunfun);
      $traceback.prepend($traceline);
    }
    return $('.traceline').on('click', function() {
      return send('Select|' + $(this).attr('data-level'));
    });
  };

  CodeMirror.keyMap.wdb = {
    "Esc": function(cm) {
      return toggle_edition(false);
    },
    fallthrough: ["default"]
  };

  CodeMirror.commands.save = function() {
    return send("Save|" + cm._fn + "|" + (cm.getValue()));
  };

  get_mode = function(fn) {
    var ext;
    ext = fn.split('.').splice(-1)[0];
    if (ext === 'py') {
      'python';
    } else if (ext === 'jinja2') {
      'jinja2';
    }
    return 'python';
  };

  create_code_mirror = function(file, name, rw) {
    if (rw == null) {
      rw = false;
    }
    window.cm = cm = CodeMirror((function(elt) {
      $('#source-editor').prepend(elt);
      return $(elt).addClass(rw ? 'rw' : 'ro');
    }), {
      value: file,
      mode: get_mode(name),
      readOnly: !rw,
      theme: cm_theme,
      keyMap: 'wdb',
      gutters: ["breakpoints", "CodeMirror-linenumbers"],
      lineNumbers: true
    });
    cm._bg_marks = {
      cls: {},
      marks: {}
    };
    cm._rw = rw;
    cm._fn = name;
    cm._file = file;
    cm._fun = null;
    cm._last_hl = null;
    cm.on("gutterClick", function(cm, n) {
      return toggle_break(':' + (n + 1));
    });
    cm.addClass = function(lno, cls) {
      cm.addLineClass(lno - 1, 'background', cls);
      if (cm._bg_marks.cls[lno]) {
        return cm._bg_marks.cls[lno] = cm._bg_marks.cls[lno] + ' ' + cls;
      } else {
        return cm._bg_marks.cls[lno] = cls;
      }
    };
    cm.removeClass = function(lno, cls) {
      cm.removeLineClass(lno - 1, 'background', cls);
      return delete cm._bg_marks.cls[lno];
    };
    cm.addMark = function(lno, cls, char) {
      cm._bg_marks.marks[lno] = [cls, char];
      return cm.setGutterMarker(lno - 1, "breakpoints", $('<div>', {
        "class": cls
      }).html(char).get(0));
    };
    return cm.removeMark = function(lno) {
      delete cm._bg_marks.marks[lno];
      return cm.setGutterMarker(lno - 1, "breakpoints", null);
    };
  };

  toggle_edition = function(rw) {
    var char, cls, lno, marks, scroll, _ref;
    cls = $.extend({}, cm._bg_marks.cls);
    marks = $.extend({}, cm._bg_marks.marks);
    scroll = $('#source .CodeMirror-scroll').scrollTop();
    $('#source .CodeMirror').remove();
    create_code_mirror(cm._file, cm._fn, rw);
    for (lno in cls) {
      cm.addClass(lno, cls[lno]);
    }
    for (lno in marks) {
      _ref = marks[lno], cls = _ref[0], char = _ref[1];
      cm.addMark(lno, cls, char);
    }
    $('#source .CodeMirror-scroll').scrollTop(scroll);
    return print({
      "for": "Toggling edition",
      result: "Edit mode " + (rw ? 'on' : 'off')
    });
  };

  select_check = function(data) {
    if (!(data.name in file_cache)) {
      return send("File|" + data.name);
    } else {
      data.file = file_cache[data.name];
      return select(data);
    }
  };

  select = function(data) {
    var $hline, $scroll, current_frame, lno, _i, _j, _len, _ref, _ref1, _ref2;
    $source = $('#source');
    current_frame = data.frame;
    $('#interpreter').show();
    $('.traceline').removeClass('selected');
    $('#trace-' + current_frame.level).addClass('selected');
    $('#eval').val('').attr('data-index', -1).trigger('autosize.resize');
    file_cache[data.name] = data.file;
    if (!window.cm) {
      create_code_mirror(data.file, data.name);
      $('#eval').focus();
    } else {
      cm = window.cm;
      if (cm._fn === data.name) {
        if (cm._fun !== current_frame["function"]) {
          for (lno in cm._bg_marks.cls) {
            cm.removeLineClass(lno - 1, 'background');
          }
        }
        for (lno in cm._bg_marks.marks) {
          cm.setGutterMarker(lno - 1, 'breakpoints', null);
        }
        if (cm._last_hl) {
          cm.removeLineClass(lno - 1, 'background');
          cm.addLineClass(lno - 1, 'background', 'footstep');
        }
      } else {
        cm.setValue(data.file);
        cm._fn = data.name;
        cm._fun = current_frame["function"];
        cm._file = data.file;
        cm._last_hl = null;
      }
      cm._bg_marks.cls = {};
      cm._bg_marks.marks = {};
    }
    _ref = data.breaks;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      lno = _ref[_i];
      cm.addClass(lno, 'breakpoint');
    }
    cm.addClass(current_frame.lno, 'highlighted');
    cm.addMark(current_frame.lno, 'highlighted', '➤');
    if (cm._fun !== current_frame["function"] && current_frame["function"] !== '<module>') {
      for (lno = _j = _ref1 = current_frame.flno, _ref2 = current_frame.llno + 1; _ref1 <= _ref2 ? _j < _ref2 : _j > _ref2; lno = _ref1 <= _ref2 ? ++_j : --_j) {
        cm.addClass(lno, 'ctx');
        if (lno === current_frame.flno) {
          cm.addClass(lno, 'ctx-top');
        } else if (lno === current_frame.llno) {
          cm.addClass(lno, 'ctx-bottom');
        }
      }
      cm._fun = current_frame["function"];
    }
    cm._last_hl = current_frame.lno;
    cm.scrollIntoView({
      line: current_frame.lno,
      ch: 1
    }, 1);
    $scroll = $('#source .CodeMirror-scroll');
    $hline = $('#source .highlighted');
    $scroll.scrollTop($hline.offset().top - $scroll.offset().top + $scroll.scrollTop() - $scroll.height() / 2);
    return chilling();
  };

  ellipsize = function($code) {
    return $code.find('span.cm-string').each(function() {
      var txt;
      txt = $(this).text();
      if (txt.length > 128) {
        $(this).text('');
        $(this).append($('<span class="short close">').text(txt.substr(0, 128)));
        return $(this).append($('<span class="long">').text(txt.substr(128)));
      }
    });
  };

  code = function(parent, src, classes, html) {
    var $code, $node, cls, _i, _len;
    if (classes == null) {
      classes = [];
    }
    if (html == null) {
      html = false;
    }
    if (html) {
      if (src[0] !== '<' || src.slice(-1) !== '>') {
        $node = $('<div>', {
          "class": 'out'
        }).html(src);
      } else {
        $node = $(src);
      }
      parent.append($node);
      $node.add($node.find('*')).contents().filter(function() {
        return this.nodeType === 3 && this.nodeValue.length > 0 && !$(this.parentElement).closest('thead').size();
      }).wrap('<code>').parent().each(function() {
        var $code, cls, _i, _len;
        $code = $(this);
        $code.addClass('waiting_for_hl').addClass('cm-s-' + cm_theme);
        for (_i = 0, _len = classes.length; _i < _len; _i++) {
          cls = classes[_i];
          $code.addClass(cls);
        }
        return setTimeout((function() {
          CodeMirror.runMode($code.text(), "python", $code.get(0));
          $code.removeClass('waiting_for_hl');
          return ellipsize($code);
        }), 50);
      });
    } else {
      $code = $('<code>', {
        'class': 'cm-s-' + cm_theme
      });
      for (_i = 0, _len = classes.length; _i < _len; _i++) {
        cls = classes[_i];
        $code.addClass(cls);
      }
      parent.append($code);
      CodeMirror.runMode(src, "python", $code.get(0));
      ellipsize($code);
    }
    return $code;
  };

  historize = function(snippet) {
    var filename, index;
    filename = $('.selected .tracefile').text();
    if (!(filename in session_cmd_hist)) {
      session_cmd_hist[filename] = [];
    }
    while ((index = cmd_hist.indexOf(snippet)) !== -1) {
      cmd_hist.splice(index, 1);
    }
    cmd_hist.unshift(snippet);
    session_cmd_hist[filename].unshift(snippet);
    return localStorage && (localStorage['cmd_hist'] = JSON.stringify(cmd_hist));
  };

  last_cmd = null;

  execute = function(snippet) {
    var cmd, data, key, space;
    snippet = snippet.trim();
    historize(snippet);
    cmd = function(cmd) {
      send(cmd);
      return last_cmd = cmd;
    };
    if (snippet.indexOf('.') === 0) {
      space = snippet.indexOf(' ');
      if (space > -1) {
        key = snippet.substr(1, space - 1);
        data = snippet.substr(space + 1);
      } else {
        key = snippet.substr(1);
        data = '';
      }
      switch (key) {
        case 'b':
          toggle_break(data);
          break;
        case 'c':
          cmd('Continue');
          break;
        case 'd':
          cmd('Dump|' + data);
          break;
        case 'e':
          toggle_edition(!cm._rw);
          break;
        case 'f':
          print_hist(session_cmd_hist[$('.selected .tracefile').text()]);
          break;
        case 'g':
          cls();
          break;
        case 'h':
          print_help();
          break;
        case 'j':
          cmd('Jump|' + data);
          break;
        case 'l':
          cmd('Breakpoints');
          break;
        case 'n':
          cmd('Next');
          break;
        case 'q':
          cmd('Quit');
          break;
        case 'r':
          cmd('Return');
          break;
        case 's':
          cmd('Step');
          break;
        case 'i':
          cmd('Display|' + data);
          break;
        case 't':
          toggle_break(data, true);
          break;
        case 'u':
          cmd('Until');
          break;
        case 'w':
          cmd('Watch|' + data);
          break;
        case 'z':
          cmd('Unbreak|' + data);
      }
      return;
    } else if (snippet.indexOf('?') === 0) {
      cmd('Dump|' + snippet.slice(1).trim());
      working();
      suggest_stop();
      return;
    } else if (snippet === '' && last_cmd) {
      cmd(last_cmd);
      return;
    }
    if (snippet) {
      send("Eval|" + snippet);
      $('#eval').val($('#eval').val() + '...').trigger('autosize.resize').prop('disabled', true);
      return working();
    }
  };

  cls = function() {
    $('#completions').height($('#interpreter').height() - $('#prompt').innerHeight());
    termscroll();
    return $('#eval').val('').trigger('autosize.resize');
  };

  print_hist = function(hist) {
    return print({
      "for": 'History',
      result: hist.slice(0).reverse().filter(function(e) {
        return e.indexOf('.') !== 0;
      }).join('\n')
    });
  };

  print_help = function() {
    return print({
      "for": 'Supported commands',
      result: '.s or [Ctrl] + [↓] or [F11]    : Step into\n.n or [Ctrl] + [→] or [F10]    : Step over (Next)\n.r or [Ctrl] + [↑] or [F9]     : Step out (Return)\n.c or [Ctrl] + [←] or [F8]     : Continue\n.u or [F7]                     : Until (Next over loops)\n.j lineno                      : Jump to lineno (Must be at bottom frame and in the same function)\n.b arg                         : Set a session breakpoint, see below for what arg can be*\n.t arg                         : Set a temporary breakpoint, arg follow the same syntax as .b\n.z arg                         : Delete existing breakpoint\n.l                             : List active breakpoints\n.f                             : Echo all typed commands in the current debugging session\n.d expression                  : Dump the result of expression in a table\n.w expression                  : Watch expression in curent file (Click on the name to remove)\n.q                             : Quit\n.h                             : Get some help\n.e                             : Toggle file edition mode\n.g                             : Clear prompt\n.i [mime/type;]expression      : Display the result in an embed, mime type defaults to "text/html"\niterable!sthg                  : If cutter is installed, executes cut(iterable).sthg\nexpr >! file                   : Write the result of expr in file\n!< file                        : Eval the content of file\n[Enter]                        : Eval the current selected text in page, useful to eval code in the source\n\n* arg is using the following syntax:\n  [file/module][:lineno][#function][,condition]\nwhich means:\n  - [file]                    : Break if any line of `file` is executed\n  - [file]:lineno             : Break on `file` at `lineno`\n  - [file][:lineno],condition : Break on `file` at `lineno` if `condition` is True (ie: i == 10)\n  - [file]#function           : Break when inside `function` function\nFile is always current file by default and you can also specify a module like `logging.config`.'
    });
  };

  termscroll = function() {
    return $('#interpreter').stop(true).animate({
      scrollTop: $('#scrollback').height()
    }, 1000);
  };

  print = function(data) {
    var snippet;
    suggest_stop();
    snippet = $('#eval').val();
    code($('#scrollback'), data["for"], ['prompted']);
    code($('#scrollback'), data.result, [], true);
    $('#eval').val('').prop('disabled', false).attr('data-index', -1).trigger('autosize.resize').focus();
    $('#completions').attr('style', '');
    termscroll();
    return chilling();
  };

  echo = function(data) {
    code($('#scrollback'), data["for"], ['prompted']);
    code($('#scrollback'), data.val || '', [], true);
    termscroll();
    return chilling();
  };

  dump = function(data) {
    var $attr_tbody, $container, $core_tbody, $method_tbody, $table, $tbody, key, val, _ref;
    code($('#scrollback'), data["for"], ['prompted']);
    $container = $('<div>');
    $table = $('<table>', {
      "class": 'object'
    }).appendTo($container);
    $table.append($('<thead>', {
      "class": 'toggle hidden'
    }).append($('<tr>').append($('<td>', {
      "class": 'core',
      colspan: 2
    }).text('Core Members'))));
    $core_tbody = $('<tbody>', {
      "class": 'core hidden'
    }).appendTo($table);
    $table.append($('<thead>', {
      "class": 'toggle hidden'
    }).append($('<tr>').append($('<td>', {
      "class": 'method',
      colspan: 2
    }).text('Methods'))));
    $method_tbody = $('<tbody>', {
      "class": 'method hidden'
    }).appendTo($table);
    $table.append($('<thead>', {
      "class": 'toggle shown'
    }).append($('<tr>').append($('<td>', {
      "class": 'attr',
      colspan: 2
    }).text('Attributes'))));
    $attr_tbody = $('<tbody>', {
      "class": 'attr shown'
    }).appendTo($table);
    _ref = data.val;
    for (key in _ref) {
      val = _ref[key];
      $tbody = $attr_tbody;
      if (key.indexOf('__') === 0 && key.indexOf('__', key.length - 2) !== -1) {
        $tbody = $core_tbody;
      } else if (val.type.indexOf('method') !== -1) {
        $tbody = $method_tbody;
      }
      $tbody.append($('<tr>').append($('<td>').text(key)).append($('<td>').html(val.val)));
    }
    code($('#scrollback'), $container.html(), [], true);
    termscroll();
    $('#eval').val('').prop('disabled', false).trigger('autosize.resize').focus();
    return chilling();
  };

  breakset = function(data) {
    var $eval;
    if (data.lno) {
      cm.removeClass(data.lno, 'ask-breakpoint');
      cm.addClass(data.lno, 'breakpoint');
      cm.addMark(data.lno, 'breakpoint', data.temporary ? '○' : '●');
      if (data.cond) {
        $line.attr('title', "On [" + data.cond + "]");
      }
    }
    $eval = $('#eval');
    if ($eval.val().indexOf('.b ') === 0 || $eval.val().indexOf('.t ') === 0) {
      $eval.val('').prop('disabled', false).trigger('autosize.resize').focus();
    }
    return chilling();
  };

  breakunset = function(data) {
    var $eval;
    cm.removeClass(data.lno, 'ask-breakpoint');
    $eval = $('#eval');
    if ($eval.val().indexOf('.b ') === 0) {
      $eval.val('').prop('disabled', false).trigger('autosize.resize').focus();
    }
    return chilling();
  };

  toggle_break = function(arg, temporary) {
    var cmd, lno;
    cmd = temporary ? 'TBreak' : 'Break';
    lno = NaN;
    if (arg.indexOf(':') > -1) {
      lno = arg.split(':')[1];
      if (lno.indexOf(',') > -1) {
        lno = arg.split(',')[0];
      }
      if (lno.indexOf('#') > -1) {
        lno = arg.split('#')[0];
      }
      lno = parseInt(lno);
    }
    if (isNaN(lno)) {
      send(cmd + '|' + arg);
      return;
    }
    cls = cm.lineInfo(lno - 1).bgClass || '';
    if (cls.split(' ').indexOf('breakpoint') > -1) {
      cm.removeMark(lno);
      cm.removeClass(lno, 'breakpoint');
      cm.addClass(lno, 'ask-breakpoint');
      return send('Unbreak|:' + lno);
    } else {
      cm.addClass(lno, 'ask-breakpoint');
      return send(cmd + '|' + arg);
    }
  };

  format_fun = function(p) {
    var i, param, tags, _i, _len, _ref;
    tags = [
      $('<span>', {
        "class": 'fun_name',
        title: p.module
      }).text(p.call_name), $('<span>', {
        "class": 'fun_punct'
      }).text('(')
    ];
    _ref = p.params;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      param = _ref[i];
      cls = 'fun_param';
      if (i === p.index || (i === p.params.length - 1 && p.index > i)) {
        cls = 'fun_param active';
      }
      tags.push($('<span>', {
        "class": cls
      }).text(param));
      if (i !== p.params.length - 1) {
        tags.push($('<span>', {
          "class": 'fun_punct'
        }).text(', '));
      }
    }
    tags.push($('<span>', {
      "class": 'fun_punct'
    }).text(')'));
    return tags;
  };

  suggest = function(data) {
    var $appender, $comp, $comp_wrapper, $eval, $tbody, $td, added, base_len, completion, height, index, param, _i, _j, _len, _len1, _ref, _ref1, _ref2;
    if (data) {
      $eval = $('#eval');
      $comp_wrapper = $('#completions');
      $comp = $('#completions table').empty();
      $comp.append($('<thead><tr><th id="comp-desc" colspan="5">'));
      height = $comp_wrapper.height();
      added = [];
      _ref = data.params;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        param = _ref[_i];
        $('#comp-desc').append(format_fun(param));
      }
      if (data.completions.length) {
        $tbody = $('<tbody>');
        base_len = data.completions[0].base.length;
        $eval.data({
          root: $eval.val().substr(0, $eval.val().length - base_len)
        });
      }
      _ref1 = data.completions;
      for (index = _j = 0, _len1 = _ref1.length; _j < _len1; index = ++_j) {
        completion = _ref1[index];
        if (_ref2 = completion.base + completion.complete, __indexOf.call(added, _ref2) >= 0) {
          continue;
        }
        added.push(completion.base + completion.complete);
        if (index % 5 === 0) {
          $tbody.append($appender = $('<tr>'));
        }
        $appender.append($td = $('<td>').attr('title', completion.description).append($('<span>').addClass('base').text(completion.base)).append($('<span>').addClass('completion').text(completion.complete)));
        if (!completion.complete) {
          $td.addClass('active complete');
          $('#comp-desc').html($td.attr('title'));
        }
      }
      $comp.append($tbody);
      $comp_wrapper.height(Math.max(height, $comp.height()));
      termscroll();
    }
    if (to_complete) {
      send('Complete|' + to_complete);
      return to_complete = false;
    } else {
      return to_complete = null;
    }
  };

  suggest_stop = function() {
    return $('#completions table').empty();
  };

  watched = function(data) {
    var $name, $value, $watcher, $watchers, value, watcher;
    $watchers = $('#watchers');
    for (watcher in data) {
      if (!__hasProp.call(data, watcher)) continue;
      value = data[watcher];
      $watcher = $watchers.find(".watching").filter(function(e) {
        return $(e).attr('data-expr') === watcher;
      });
      if (!$watcher.size()) {
        $name = $('<code>', {
          "class": "name"
        });
        $value = $('<div>', {
          "class": "value"
        });
        $watchers.append($watcher = $('<div>', {
          "class": "watching"
        }).attr('data-expr', watcher).append($name.text(watcher), $('<code>').text(': '), $value));
        code($value, value.toString(), [], true);
      } else {
        $watcher.find('.value code').remove();
        code($watcher.find('.value'), value.toString(), [], true);
      }
      $watcher.addClass('updated');
    }
    $watchers.find('.watching:not(.updated)').remove();
    return $watchers.find('.watching').removeClass('updated');
  };

  ack = function() {
    return $('#eval').val('').trigger('autosize.resize');
  };

  log = function(data) {
    return console.log(data.message);
  };

  display = function(data) {
    var $tag, snippet;
    suggest_stop();
    snippet = $('#eval').val();
    code($('#scrollback'), data["for"], ['prompted']);
    if (data.type.indexOf('image') >= 0) {
      $tag = $("<img>");
    } else if (data.type.indexOf('audio') >= 0) {
      $tag = $("<audio>", {
        controls: 'controls',
        autoplay: 'autoplay'
      });
    } else if (data.type.indexOf('video') >= 0 || data.type.indexOf('/ogg') >= 0) {
      $tag = $("<video>", {
        controls: 'controls',
        autoplay: 'autoplay'
      });
    } else {
      $tag = $("<iframe>");
    }
    $tag.addClass('display');
    $tag.attr('src', "data:" + data.type + ";charset=UTF-8;base64," + data.val);
    $('#scrollback').append($tag);
    $('#eval').val('').prop('disabled', false).attr('data-index', -1).trigger('autosize.resize').focus();
    $('#completions').attr('style', '');
    termscroll();
    return chilling();
  };

  searchback = function() {
    var h, index, re, val, _i, _len;
    suggest_stop();
    index = backsearch;
    val = $('#eval').val();
    for (_i = 0, _len = cmd_hist.length; _i < _len; _i++) {
      h = cmd_hist[_i];
      re = new RegExp('(' + val + ')', 'gi');
      if (re.test(h)) {
        index--;
        if (index === 0) {
          $('#backsearch').html(h.replace(re, '<span class="backsearched">$1</span>'));
          return;
        }
      }
    }
    if (backsearch === 1) {
      searchback_stop();
      return;
    }
    return backsearch = Math.max(backsearch - 1, 1);
  };

  searchback_stop = function(validate) {
    if (validate) {
      $('#eval').val($('#backsearch').text()).trigger('autosize.resize');
    }
    $('#backsearch').html('');
    return backsearch = null;
  };

  die = function() {
    $('#source,#traceback').remove();
    $('h1').html('Dead<small>Program has exited</small>');
    ws.close();
    return setTimeout((function() {
      return close();
    }), 10);
  };

  register_handlers = function() {
    $('body,html').on('keydown', function(e) {
      if (cm._rw) {
        return true;
      }
      if ((e.ctrlKey && e.keyCode === 37) || e.keyCode === 119) {
        send('Continue');
      } else if ((e.ctrlKey && e.keyCode === 38) || e.keyCode === 120) {
        send('Return');
      } else if ((e.ctrlKey && e.keyCode === 39) || e.keyCode === 121) {
        send('Next');
      } else if ((e.ctrlKey && e.keyCode === 40) || e.keyCode === 122) {
        send('Step');
      } else if (e.keyCode === 118) {
        send('Until');
      } else {
        return true;
      }
      working();
      return false;
    });
    $('#eval').on('keydown', function(e) {
      var $active, $eval, $tds, base, completion, endPos, filename, index, startPos, to_set, txtarea;
      $eval = $(this);
      if (e.altKey && e.keyCode === 82 && backsearch) {
        backsearch = Math.max(backsearch - 1, 1);
        searchback();
        return false;
      }
      if (e.ctrlKey) {
        if (e.keyCode === 82) {
          if (backsearch === null) {
            backsearch = 1;
          } else {
            if (e.shiftKey) {
              backsearch = Math.max(backsearch - 1, 1);
            } else {
              backsearch++;
            }
          }
          searchback();
          return false;
        } else if (e.keyCode === 67) {
          searchback_stop();
        } else if (e.keyCode === 68) {
          send('Quit');
        } else {
          e.stopPropagation();
          return;
        }
      }
      if (e.keyCode === 13) {
        if (backsearch) {
          searchback_stop(true);
          return false;
        }
        if ($('#completions table td.active').length && !$('#completions table td.complete').length) {
          suggest_stop();
          return false;
        }
        $eval = $(this);
        if (!e.shiftKey) {
          execute($eval.val());
          return false;
        }
      } else if (e.keyCode === 27) {
        suggest_stop();
        searchback_stop();
        return false;
      } else if (e.keyCode === 9) {
        if (e.shiftKey) {
          $eval = $(this);
          txtarea = $eval.get(0);
          startPos = txtarea.selectionStart;
          endPos = txtarea.selectionEnd;
          if (startPos || startPos === '0') {
            $eval.val($eval.val().substring(0, startPos) + '    ' + $eval.val().substring(endPos, $eval.val().length)).trigger('autosize.resize');
          } else {
            $eval.val($eval.val() + '    ').trigger('autosize.resize');
          }
          return false;
        }
        if (backsearch) {
          return false;
        }
        $tds = $('#completions table td');
        $active = $tds.filter('.active');
        if ($tds.length) {
          if (!$active.length) {
            $active = $tds.first().addClass('active');
          } else {
            index = $tds.index($active);
            if (index === $tds.length - 1) {
              index = 0;
            } else {
              index++;
            }
            $active.removeClass('active complete');
            $active = $tds.eq(index).addClass('active');
          }
          base = $active.find('.base').text();
          completion = $active.find('.completion').text();
          $eval.val($eval.data().root + base + completion).trigger('autosize.resize');
          $('#comp-desc').text($active.attr('title'));
          termscroll();
        }
        return false;
      } else if (e.keyCode === 38) {
        $eval = $(this);
        filename = $('.selected .tracefile').text();
        if (!e.shiftKey) {
          index = parseInt($eval.attr('data-index')) + 1;
          if (index >= 0 && index < cmd_hist.length) {
            to_set = cmd_hist[index];
            if (index === 0) {
              $eval.attr('data-current', $eval.val());
            }
            $eval.val(to_set).attr('data-index', index).trigger('autosize.resize');
            suggest_stop();
            termscroll();
            return false;
          }
        }
      } else if (e.keyCode === 40) {
        $eval = $(this);
        filename = $('.selected .tracefile').text();
        if (!e.shiftKey) {
          index = parseInt($eval.attr('data-index')) - 1;
          if (index >= -1 && index < cmd_hist.length) {
            if (index === -1) {
              to_set = $eval.attr('data-current');
            } else {
              to_set = cmd_hist[index];
            }
            $eval.val(to_set).attr('data-index', index).trigger('autosize.resize');
            suggest_stop();
            termscroll();
            return false;
          }
        }
      }
    });
    $("#scrollback, #watchers").on('click', 'a.inspect', function() {
      send('Inspect|' + $(this).attr('href'));
      working();
      return false;
    }).on('click', '.short.close', function() {
      return $(this).addClass('open').removeClass('close').next('.long').show('fast');
    }).on('click', '.long,.short.open', function() {
      var elt;
      elt = $(this).hasClass('long') ? $(this) : $(this).next('.long');
      return elt.hide('fast').prev('.short').removeClass('open').addClass('close');
    }).on('click', '.toggle', function() {
      return $(this).add($(this).next()).toggleClass('hidden', 'shown');
    });
    $("#watchers").on('click', '.watching .name', function(e) {
      send('Unwatch|' + $(this).closest('.watching').attr('data-expr'));
      return working();
    });
    $("#source").on('mouseup', 'span', function(e) {
      var target;
      if (e.which === 2) {
        target = $(this).text().trim();
        historize(target);
        send('Dump|' + target);
        return working();
      }
    });
    $(document).on('keydown', function(e) {
      var sel;
      if (e.keyCode === 13) {
        sel = cm.getSelection().trim();
        if (sel) {
          historize(sel);
          send('Eval|' + sel);
          return false;
        }
      }
    });
    return $('#eval').on('input', function() {
      var comp, hist, txt;
      txt = $(this).val();
      if (backsearch) {
        if (!txt) {
          searchback_stop();
        } else {
          backsearch = 1;
          searchback();
        }
        return;
      }
      hist = session_cmd_hist[$('.selected .tracefile').text()] || [];
      if (txt && txt[0] !== '.') {
        comp = hist.slice(0).reverse().filter(function(e) {
          return e.indexOf('.') !== 0;
        }).join('\n') + '\n' + txt;
        if (to_complete === null) {
          send('Complete|' + comp);
          return to_complete = false;
        } else {
          return to_complete = comp;
        }
      } else {
        return suggest_stop();
      }
    }).on('blur', function() {
      return searchback_stop();
    });
  };

}).call(this);
