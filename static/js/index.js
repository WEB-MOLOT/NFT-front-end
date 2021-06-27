;(function (window, $, undefined) { ;(function () {
    var VERSION = '2.2.3',
        pluginName = 'datepicker',
        autoInitSelector = '.datepicker-here',
        $body, $datepickersContainer,
        containerBuilt = false,
        baseTemplate = '' +
            '<div class="datepicker">' +
            '<i class="datepicker--pointer"></i>' +
            '<nav class="datepicker--nav"></nav>' +
            '<div class="datepicker--content"></div>' +
            '</div>',
        defaults = {
            classes: '',
            inline: false,
            language: 'ru',
            startDate: new Date(),
            firstDay: '',
            weekends: [6, 0],
            dateFormat: '',
            altField: '',
            altFieldDateFormat: '@',
            toggleSelected: true,
            keyboardNav: true,

            position: 'bottom left',
            offset: 12,

            view: 'days',
            minView: 'days',

            showOtherMonths: true,
            selectOtherMonths: true,
            moveToOtherMonthsOnSelect: true,

            showOtherYears: true,
            selectOtherYears: true,
            moveToOtherYearsOnSelect: true,

            minDate: '',
            maxDate: '',
            disableNavWhenOutOfRange: true,

            multipleDates: false, // Boolean or Number
            multipleDatesSeparator: ',',
            range: false,

            todayButton: false,
            clearButton: false,

            showEvent: 'focus',
            autoClose: false,

            // navigation
            monthsField: 'monthsShort',
            prevHtml: '<svg><path d="M 17,12 l -5,5 l 5,5"></path></svg>',
            nextHtml: '<svg><path d="M 14,12 l 5,5 l -5,5"></path></svg>',
            navTitles: {
                days: 'MM, <i>yyyy</i>',
                months: 'yyyy',
                years: 'yyyy1 - yyyy2'
            },

            // timepicker
            timepicker: false,
            onlyTimepicker: false,
            dateTimeSeparator: ' ',
            timeFormat: '',
            minHours: 0,
            maxHours: 24,
            minMinutes: 0,
            maxMinutes: 59,
            hoursStep: 1,
            minutesStep: 1,
            inputID: 1,

            // events
            onSelect: '',
            onShow: '',
            onHide: '',
            onChangeMonth: '',
            onChangeYear: '',
            onChangeDecade: '',
            onChangeView: '',
            onRenderCell: ''
        },
        hotKeys = {
            'ctrlRight': [17, 39],
            'ctrlUp': [17, 38],
            'ctrlLeft': [17, 37],
            'ctrlDown': [17, 40],
            'shiftRight': [16, 39],
            'shiftUp': [16, 38],
            'shiftLeft': [16, 37],
            'shiftDown': [16, 40],
            'altUp': [18, 38],
            'altRight': [18, 39],
            'altLeft': [18, 37],
            'altDown': [18, 40],
            'ctrlShiftUp': [16, 17, 38]
        },
        datepicker;

    var Datepicker  = function (el, options) {
        this.el = el;
        this.$el = $(el);

        this.opts = $.extend(true, {}, defaults, options, this.$el.data());

        if ($body == undefined) {
            $body = $('body');
        }

        if (!this.opts.startDate) {
            this.opts.startDate = new Date();
        }

        if (this.el.nodeName == 'INPUT') {
            this.elIsInput = true;
        }

        if (this.opts.altField) {
            this.$altField = typeof this.opts.altField == 'string' ? $(this.opts.altField) : this.opts.altField;
        }

        this.inited = false;
        this.visible = false;
        this.silent = false; // Need to prevent unnecessary rendering

        this.currentDate = this.opts.startDate;
        this.currentView = this.opts.view;
        this._createShortCuts();
        this.selectedDates = [];
        this.views = {};
        this.keys = [];
        this.minRange = '';
        this.maxRange = '';
        this._prevOnSelectValue = '';

        this.init()
    };

    datepicker = Datepicker;

    datepicker.prototype = {
        VERSION: VERSION,
        viewIndexes: ['days', 'months', 'years'],

        init: function () {
            if (!containerBuilt && !this.opts.inline && this.elIsInput) {
                this._buildDatepickersContainer();
            }
            this._buildBaseHtml();
            this._defineLocale(this.opts.language);
            this._syncWithMinMaxDates();

            if (this.elIsInput) {
                if (!this.opts.inline) {
                    // Set extra classes for proper transitions
                    this._setPositionClasses(this.opts.position);
                    this._bindEvents()
                }
                if (this.opts.keyboardNav && !this.opts.onlyTimepicker) {
                    this._bindKeyboardEvents();
                }
                this.$datepicker.on('mousedown', this._onMouseDownDatepicker.bind(this));
                this.$datepicker.on('mouseup', this._onMouseUpDatepicker.bind(this));
            }

            if (this.opts.classes) {
                this.$datepicker.addClass(this.opts.classes)
            }

            if (this.opts.timepicker) {
                this.timepicker = new $.fn.datepicker.Timepicker(this, this.opts);
                this._bindTimepickerEvents();
            }

            if (this.opts.onlyTimepicker) {
                this.$datepicker.addClass('-only-timepicker-');
            }

            this.views[this.currentView] = new $.fn.datepicker.Body(this, this.currentView, this.opts);
            this.views[this.currentView].show();
            this.nav = new $.fn.datepicker.Navigation(this, this.opts);
            this.view = this.currentView;

            this.$el.on('clickCell.adp', this._onClickCell.bind(this));
            this.$datepicker.on('mouseenter', '.datepicker--cell', this._onMouseEnterCell.bind(this));
            this.$datepicker.on('mouseleave', '.datepicker--cell', this._onMouseLeaveCell.bind(this));

            this.inited = true;
        },

        _createShortCuts: function () {
            this.minDate = this.opts.minDate ? this.opts.minDate : new Date(-8639999913600000);
            this.maxDate = this.opts.maxDate ? this.opts.maxDate : new Date(8639999913600000);
        },

        _bindEvents : function () {
            this.$el.on(this.opts.showEvent + '.adp', this._onShowEvent.bind(this));
            this.$el.on('mouseup.adp', this._onMouseUpEl.bind(this));
            this.$el.on('blur.adp', this._onBlur.bind(this));
            this.$el.on('keyup.adp', this._onKeyUpGeneral.bind(this));
            $(window).on('resize.adp', this._onResize.bind(this));
            $('body').on('mouseup.adp', this._onMouseUpBody.bind(this));
        },

        _bindKeyboardEvents: function () {
            this.$el.on('keydown.adp', this._onKeyDown.bind(this));
            this.$el.on('keyup.adp', this._onKeyUp.bind(this));
            this.$el.on('hotKey.adp', this._onHotKey.bind(this));
        },

        _bindTimepickerEvents: function () {
            this.$el.on('timeChange.adp', this._onTimeChange.bind(this));
        },

        isWeekend: function (day) {
            return this.opts.weekends.indexOf(day) !== -1;
        },

        _defineLocale: function (lang) {
            if (typeof lang == 'string') {
                this.loc = $.fn.datepicker.language[lang];
                if (!this.loc) {
                    console.warn('Can\'t find language "' + lang + '" in Datepicker.language, will use "ru" instead');
                    this.loc = $.extend(true, {}, $.fn.datepicker.language.ru)
                }

                this.loc = $.extend(true, {}, $.fn.datepicker.language.ru, $.fn.datepicker.language[lang])
            } else {
                this.loc = $.extend(true, {}, $.fn.datepicker.language.ru, lang)
            }

            if (this.opts.dateFormat) {
                this.loc.dateFormat = this.opts.dateFormat
            }

            if (this.opts.timeFormat) {
                this.loc.timeFormat = this.opts.timeFormat
            }

            if (this.opts.firstDay !== '') {
                this.loc.firstDay = this.opts.firstDay
            }

            if (this.opts.timepicker) {
                this.loc.dateFormat = [this.loc.dateFormat, this.loc.timeFormat].join(this.opts.dateTimeSeparator);
            }

            if (this.opts.onlyTimepicker) {
                this.loc.dateFormat = this.loc.timeFormat;
            }

            var boundary = this._getWordBoundaryRegExp;
            if (this.loc.timeFormat.match(boundary('aa')) ||
                this.loc.timeFormat.match(boundary('AA'))
            ) {
               this.ampm = true;
            }
        },

        _buildDatepickersContainer: function () {
            containerBuilt = true;
            $body.append('<div class="datepickers-container" id="datepickers-container"></div>');
            $datepickersContainer = $('#datepickers-container');
        },

        _buildBaseHtml: function () {
            var $appendTarget,
                $inline = $('<div class="datepicker-inline">');

            if(this.el.nodeName == 'INPUT') {
                if (!this.opts.inline) {
                    $appendTarget = $datepickersContainer;
                } else {
                    $appendTarget = $inline.insertAfter(this.$el)
                }
            } else {
                $appendTarget = $inline.appendTo(this.$el)
            }

            this.$datepicker = $(baseTemplate).appendTo($appendTarget);
            this.$content = $('.datepicker--content', this.$datepicker);
            this.$nav = $('.datepicker--nav', this.$datepicker);
        },

        _triggerOnChange: function () {
            if (!this.selectedDates.length) {
                // Prevent from triggering multiple onSelect callback with same argument (empty string) in IE10-11
                if (this._prevOnSelectValue === '') return;
                this._prevOnSelectValue = '';
                return this.opts.onSelect('', '', this);
            }

            var selectedDates = this.selectedDates,
                parsedSelected = datepicker.getParsedDate(selectedDates[0]),
                formattedDates,
                _this = this,
                dates = new Date(
                    parsedSelected.year,
                    parsedSelected.month,
                    parsedSelected.date,
                    parsedSelected.hours,
                    parsedSelected.minutes
                );

                formattedDates = selectedDates.map(function (date) {
                    return _this.formatDate(_this.loc.dateFormat, date)
                }).join(this.opts.multipleDatesSeparator);

            // Create new dates array, to separate it from original selectedDates
            if (this.opts.multipleDates || this.opts.range) {
                dates = selectedDates.map(function(date) {
                    var parsedDate = datepicker.getParsedDate(date);
                    return new Date(
                        parsedDate.year,
                        parsedDate.month,
                        parsedDate.date,
                        parsedDate.hours,
                        parsedDate.minutes
                    );
                })
            }

            this._prevOnSelectValue = formattedDates;
            this.opts.onSelect(formattedDates, dates, this);
        },

        next: function () {
            var d = this.parsedDate,
                o = this.opts;
            switch (this.view) {
                case 'days':
                    this.date = new Date(d.year, d.month + 1, 1);
                    if (o.onChangeMonth) o.onChangeMonth(this.parsedDate.month, this.parsedDate.year);
                    break;
                case 'months':
                    this.date = new Date(d.year + 1, d.month, 1);
                    if (o.onChangeYear) o.onChangeYear(this.parsedDate.year);
                    break;
                case 'years':
                    this.date = new Date(d.year + 10, 0, 1);
                    if (o.onChangeDecade) o.onChangeDecade(this.curDecade);
                    break;
            }
        },

        prev: function () {
            var d = this.parsedDate,
                o = this.opts;
            switch (this.view) {
                case 'days':
                    this.date = new Date(d.year, d.month - 1, 1);
                    if (o.onChangeMonth) o.onChangeMonth(this.parsedDate.month, this.parsedDate.year);
                    break;
                case 'months':
                    this.date = new Date(d.year - 1, d.month, 1);
                    if (o.onChangeYear) o.onChangeYear(this.parsedDate.year);
                    break;
                case 'years':
                    this.date = new Date(d.year - 10, 0, 1);
                    if (o.onChangeDecade) o.onChangeDecade(this.curDecade);
                    break;
            }
        },

        formatDate: function (string, date) {
            date = date || this.date;
            var result = string,
                boundary = this._getWordBoundaryRegExp,
                locale = this.loc,
                leadingZero = datepicker.getLeadingZeroNum,
                decade = datepicker.getDecade(date),
                d = datepicker.getParsedDate(date),
                fullHours = d.fullHours,
                hours = d.hours,
                ampm = string.match(boundary('aa')) || string.match(boundary('AA')),
                dayPeriod = 'am',
                replacer = this._replacer,
                validHours;

            if (this.opts.timepicker && this.timepicker && ampm) {
                validHours = this.timepicker._getValidHoursFromDate(date, ampm);
                fullHours = leadingZero(validHours.hours);
                hours = validHours.hours;
                dayPeriod = validHours.dayPeriod;
            }

            switch (true) {
                case /@/.test(result):
                    result = result.replace(/@/, date.getTime());
                case /aa/.test(result):
                    result = replacer(result, boundary('aa'), dayPeriod);
                case /AA/.test(result):
                    result = replacer(result, boundary('AA'), dayPeriod.toUpperCase());
                case /dd/.test(result):
                    result = replacer(result, boundary('dd'), d.fullDate);
                case /d/.test(result):
                    result = replacer(result, boundary('d'), d.date);
                case /DD/.test(result):
                    result = replacer(result, boundary('DD'), locale.days[d.day]);
                case /D/.test(result):
                    result = replacer(result, boundary('D'), locale.daysShort[d.day]);
                case /mm/.test(result):
                    result = replacer(result, boundary('mm'), d.fullMonth);
                case /m/.test(result):
                    result = replacer(result, boundary('m'), d.month + 1);
                case /MM/.test(result):
                    result = replacer(result, boundary('MM'), this.loc.months[d.month]);
                case /M/.test(result):
                    result = replacer(result, boundary('M'), locale.monthsShort[d.month]);
                case /ii/.test(result):
                    result = replacer(result, boundary('ii'), d.fullMinutes);
                case /i/.test(result):
                    result = replacer(result, boundary('i'), d.minutes);
                case /hh/.test(result):
                    result = replacer(result, boundary('hh'), fullHours);
                case /h/.test(result):
                    result = replacer(result, boundary('h'), hours);
                case /yyyy/.test(result):
                    result = replacer(result, boundary('yyyy'), d.year);
                case /yyyy1/.test(result):
                    result = replacer(result, boundary('yyyy1'), decade[0]);
                case /yyyy2/.test(result):
                    result = replacer(result, boundary('yyyy2'), decade[1]);
                case /yy/.test(result):
                    result = replacer(result, boundary('yy'), d.year.toString().slice(-2));
            }

            return result;
        },

        _replacer: function (str, reg, data) {
            return str.replace(reg, function (match, p1,p2,p3) {
                return p1 + data + p3;
            })
        },

        _getWordBoundaryRegExp: function (sign) {
            var symbols = '\\s|\\.|-|/|\\\\|,|\\$|\\!|\\?|:|;';

            return new RegExp('(^|>|' + symbols + ')(' + sign + ')($|<|' + symbols + ')', 'g');
        },


        selectDate: function (date) {
            var _this = this,
                opts = _this.opts,
                d = _this.parsedDate,
                selectedDates = _this.selectedDates,
                len = selectedDates.length,
                newDate = '';

            if (Array.isArray(date)) {
                date.forEach(function (d) {
                    _this.selectDate(d)
                });
                return;
            }

            if (!(date instanceof Date)) return;

            this.lastSelectedDate = date;

            // Set new time values from Date
            if (this.timepicker) {
                this.timepicker._setTime(date);
            }

            // On this step timepicker will set valid values in it's instance
            _this._trigger('selectDate', date);

            // Set correct time values after timepicker's validation
            // Prevent from setting hours or minutes which values are lesser then `min` value or
            // greater then `max` value
            if (this.timepicker) {
                date.setHours(this.timepicker.hours);
                date.setMinutes(this.timepicker.minutes)
            }

            if (_this.view == 'days') {
                if (date.getMonth() != d.month && opts.moveToOtherMonthsOnSelect) {
                    newDate = new Date(date.getFullYear(), date.getMonth(), 1);
                }
            }

            if (_this.view == 'years') {
                if (date.getFullYear() != d.year && opts.moveToOtherYearsOnSelect) {
                    newDate = new Date(date.getFullYear(), 0, 1);
                }
            }

            if (newDate) {
                _this.silent = true;
                _this.date = newDate;
                _this.silent = false;
                _this.nav._render()
            }

            if (opts.multipleDates && !opts.range) { // Set priority to range functionality
                if (len === opts.multipleDates) return;
                if (!_this._isSelected(date)) {
                    _this.selectedDates.push(date);
                }
            } else if (opts.range) {
                if (len == 2) {
                    _this.selectedDates = [date];
                    _this.minRange = date;
                    _this.maxRange = '';
                } else if (len == 1) {
                    _this.selectedDates.push(date);
                    if (!_this.maxRange){
                        _this.maxRange = date;
                    } else {
                        _this.minRange = date;
                    }
                    // Swap dates if they were selected via dp.selectDate() and second date was smaller then first
                    if (datepicker.bigger(_this.maxRange, _this.minRange)) {
                        _this.maxRange = _this.minRange;
                        _this.minRange = date;
                    }
                    _this.selectedDates = [_this.minRange, _this.maxRange]

                } else {
                    _this.selectedDates = [date];
                    _this.minRange = date;
                }
            } else {
                _this.selectedDates = [date];
            }

            _this._setInputValue();

            if (opts.onSelect) {
                _this._triggerOnChange();
            }

            if (opts.autoClose && !this.timepickerIsActive) {
                if (!opts.multipleDates && !opts.range) {
                    _this.hide();
                } else if (opts.range && _this.selectedDates.length == 2) {
                    _this.hide();
                }
            }

            _this.views[this.currentView]._render()
        },

        removeDate: function (date) {
            var selected = this.selectedDates,
                _this = this;

            if (!(date instanceof Date)) return;

            return selected.some(function (curDate, i) {
                if (datepicker.isSame(curDate, date)) {
                    selected.splice(i, 1);

                    if (!_this.selectedDates.length) {
                        _this.minRange = '';
                        _this.maxRange = '';
                        _this.lastSelectedDate = '';
                    } else {
                        _this.lastSelectedDate = _this.selectedDates[_this.selectedDates.length - 1];
                    }

                    _this.views[_this.currentView]._render();
                    _this._setInputValue();

                    if (_this.opts.onSelect) {
                        _this._triggerOnChange();
                    }

                    return true
                }
            })
        },

        today: function () {
            this.silent = true;
            this.view = this.opts.minView;
            this.silent = false;
            this.date = new Date();

            if (this.opts.todayButton instanceof Date) {
                this.selectDate(this.opts.todayButton)
            }
        },

        clear: function () {
            this.selectedDates = [];
            this.minRange = '';
            this.maxRange = '';
            this.views[this.currentView]._render();
            this._setInputValue();
            if (this.opts.onSelect) {
                this._triggerOnChange()
            }
        },

        /**
         * Updates datepicker options
         * @param {String|Object} param - parameter's name to update. If object then it will extend current options
         * @param {String|Number|Object} [value] - new param value
         */
        update: function (param, value) {
            var len = arguments.length,
                lastSelectedDate = this.lastSelectedDate;

            if (len == 2) {
                this.opts[param] = value;
            } else if (len == 1 && typeof param == 'object') {
                this.opts = $.extend(true, this.opts, param)
            }

            this._createShortCuts();
            this._syncWithMinMaxDates();
            this._defineLocale(this.opts.language);
            this.nav._addButtonsIfNeed();
            if (!this.opts.onlyTimepicker) this.nav._render();
            this.views[this.currentView]._render();

            if (this.elIsInput && !this.opts.inline) {
                this._setPositionClasses(this.opts.position);
                if (this.visible) {
                    this.setPosition(this.opts.position)
                }
            }

            if (this.opts.classes) {
                this.$datepicker.addClass(this.opts.classes)
            }

            if (this.opts.onlyTimepicker) {
                this.$datepicker.addClass('-only-timepicker-');
            }

            if (this.opts.timepicker) {
                if (lastSelectedDate) this.timepicker._handleDate(lastSelectedDate);
                this.timepicker._updateRanges();
                this.timepicker._updateCurrentTime();
                // Change hours and minutes if it's values have been changed through min/max hours/minutes
                if (lastSelectedDate) {
                    lastSelectedDate.setHours(this.timepicker.hours);
                    lastSelectedDate.setMinutes(this.timepicker.minutes);
                }
            }

            this._setInputValue();

            return this;
        },

        _syncWithMinMaxDates: function () {
            var curTime = this.date.getTime();
            this.silent = true;
            if (this.minTime > curTime) {
                this.date = this.minDate;
            }

            if (this.maxTime < curTime) {
                this.date = this.maxDate;
            }
            this.silent = false;
        },

        _isSelected: function (checkDate, cellType) {
            var res = false;
            this.selectedDates.some(function (date) {
                if (datepicker.isSame(date, checkDate, cellType)) {
                    res = date;
                    return true;
                }
            });
            return res;
        },

        _setInputValue: function () {
            var _this = this,
                opts = _this.opts,
                format = _this.loc.dateFormat,
                altFormat = opts.altFieldDateFormat,
                value = _this.selectedDates.map(function (date) {
                    return _this.formatDate(format, date)
                }),
                altValues;

            if (opts.altField && _this.$altField.length) {
                altValues = this.selectedDates.map(function (date) {
                    return _this.formatDate(altFormat, date)
                });
                altValues = altValues.join(this.opts.multipleDatesSeparator);
                this.$altField.val(altValues);
            }

            value = value.join(this.opts.multipleDatesSeparator);

            this.$el.val(value)
        },

        /**
         * Check if date is between minDate and maxDate
         * @param date {object} - date object
         * @param type {string} - cell type
         * @returns {boolean}
         * @private
         */
        _isInRange: function (date, type) {
            var time = date.getTime(),
                d = datepicker.getParsedDate(date),
                min = datepicker.getParsedDate(this.minDate),
                max = datepicker.getParsedDate(this.maxDate),
                dMinTime = new Date(d.year, d.month, min.date).getTime(),
                dMaxTime = new Date(d.year, d.month, max.date).getTime(),
                types = {
                    day: time >= this.minTime && time <= this.maxTime,
                    month: dMinTime >= this.minTime && dMaxTime <= this.maxTime,
                    year: d.year >= min.year && d.year <= max.year
                };
            return type ? types[type] : types.day
        },

        _getDimensions: function ($el) {
            var offset = $el.offset();

            return {
                width: $el.outerWidth(),
                height: $el.outerHeight(),
                left: offset.left,
                top: offset.top
            }
        },

        _getDateFromCell: function (cell) {
            var curDate = this.parsedDate,
                year = cell.data('year') || curDate.year,
                month = cell.data('month') == undefined ? curDate.month : cell.data('month'),
                date = cell.data('date') || 1;

            return new Date(year, month, date);
        },

        _setPositionClasses: function (pos) {
            pos = pos.split(' ');
            var main = pos[0],
                sec = pos[1],
                classes = 'datepicker -' + main + '-' + sec + '- -from-' + main + '-';

            if (this.visible) classes += ' active';

            this.$datepicker
                .removeAttr('class')
                .addClass(classes);
        },

        setPosition: function (position) {
            position = position || this.opts.position;

            var dims = this._getDimensions(this.$el),
                selfDims = this._getDimensions(this.$datepicker),
                pos = position.split(' '),
                top, left,
                offset = this.opts.offset,
                main = pos[0],
                secondary = pos[1];

            switch (main) {
                case 'top':
                    top = dims.top - selfDims.height - offset;
                    break;
                case 'right':
                    left = dims.left + dims.width + offset;
                    break;
                case 'bottom':
                    top = dims.top + dims.height + offset;
                    break;
                case 'left':
                    left = dims.left - selfDims.width - offset;
                    break;
            }

            switch(secondary) {
                case 'top':
                    top = dims.top;
                    break;
                case 'right':
                    left = dims.left + dims.width - selfDims.width;
                    break;
                case 'bottom':
                    top = dims.top + dims.height - selfDims.height;
                    break;
                case 'left':
                    left = dims.left;
                    break;
                case 'center':
                    if (/left|right/.test(main)) {
                        top = dims.top + dims.height/2 - selfDims.height/2;
                    } else {
                        left = dims.left + dims.width/2 - selfDims.width/2;
                    }
            }

            this.$datepicker
                .css({
                    left: left,
                    top: top
                })
        },

        show: function () {
            var onShow = this.opts.onShow;

            this.setPosition(this.opts.position);
            this.$datepicker.addClass('active');
            this.visible = true;

            if (onShow) {
                this._bindVisionEvents(onShow)
            }
        },

        hide: function () {
            var onHide = this.opts.onHide;

            this.$datepicker
                .removeClass('active')
                .css({
                    left: '-100000px'
                });

            this.focused = '';
            this.keys = [];

            this.inFocus = false;
            this.visible = false;
            this.$el.blur();

            if (onHide) {
                this._bindVisionEvents(onHide)
            }
        },

        down: function (date) {
            this._changeView(date, 'down');
        },

        up: function (date) {
            this._changeView(date, 'up');
        },

        _bindVisionEvents: function (event) {
            this.$datepicker.off('transitionend.dp');
            event(this, false);
            this.$datepicker.one('transitionend.dp', event.bind(this, this, true))
        },

        _changeView: function (date, dir) {
            date = date || this.focused || this.date;

            var nextView = dir == 'up' ? this.viewIndex + 1 : this.viewIndex - 1;
            if (nextView > 2) nextView = 2;
            if (nextView < 0) nextView = 0;

            this.silent = true;
            this.date = new Date(date.getFullYear(), date.getMonth(), 1);
            this.silent = false;
            this.view = this.viewIndexes[nextView];

        },

        _handleHotKey: function (key) {
            var date = datepicker.getParsedDate(this._getFocusedDate()),
                focusedParsed,
                o = this.opts,
                newDate,
                totalDaysInNextMonth,
                monthChanged = false,
                yearChanged = false,
                decadeChanged = false,
                y = date.year,
                m = date.month,
                d = date.date;

            switch (key) {
                case 'ctrlRight':
                case 'ctrlUp':
                    m += 1;
                    monthChanged = true;
                    break;
                case 'ctrlLeft':
                case 'ctrlDown':
                    m -= 1;
                    monthChanged = true;
                    break;
                case 'shiftRight':
                case 'shiftUp':
                    yearChanged = true;
                    y += 1;
                    break;
                case 'shiftLeft':
                case 'shiftDown':
                    yearChanged = true;
                    y -= 1;
                    break;
                case 'altRight':
                case 'altUp':
                    decadeChanged = true;
                    y += 10;
                    break;
                case 'altLeft':
                case 'altDown':
                    decadeChanged = true;
                    y -= 10;
                    break;
                case 'ctrlShiftUp':
                    this.up();
                    break;
            }

            totalDaysInNextMonth = datepicker.getDaysCount(new Date(y,m));
            newDate = new Date(y,m,d);

            // If next month has less days than current, set date to total days in that month
            if (totalDaysInNextMonth < d) d = totalDaysInNextMonth;

            // Check if newDate is in valid range
            if (newDate.getTime() < this.minTime) {
                newDate = this.minDate;
            } else if (newDate.getTime() > this.maxTime) {
                newDate = this.maxDate;
            }

            this.focused = newDate;

            focusedParsed = datepicker.getParsedDate(newDate);
            if (monthChanged && o.onChangeMonth) {
                o.onChangeMonth(focusedParsed.month, focusedParsed.year)
            }
            if (yearChanged && o.onChangeYear) {
                o.onChangeYear(focusedParsed.year)
            }
            if (decadeChanged && o.onChangeDecade) {
                o.onChangeDecade(this.curDecade)
            }
        },

        _registerKey: function (key) {
            var exists = this.keys.some(function (curKey) {
                return curKey == key;
            });

            if (!exists) {
                this.keys.push(key)
            }
        },

        _unRegisterKey: function (key) {
            var index = this.keys.indexOf(key);

            this.keys.splice(index, 1);
        },

        _isHotKeyPressed: function () {
            var currentHotKey,
                found = false,
                _this = this,
                pressedKeys = this.keys.sort();

            for (var hotKey in hotKeys) {
                currentHotKey = hotKeys[hotKey];
                if (pressedKeys.length != currentHotKey.length) continue;

                if (currentHotKey.every(function (key, i) { return key == pressedKeys[i]})) {
                    _this._trigger('hotKey', hotKey);
                    found = true;
                }
            }

            return found;
        },

        _trigger: function (event, args) {
            this.$el.trigger(event, args)
        },

        _focusNextCell: function (keyCode, type) {
            type = type || this.cellType;

            var date = datepicker.getParsedDate(this._getFocusedDate()),
                y = date.year,
                m = date.month,
                d = date.date;

            if (this._isHotKeyPressed()){
                return;
            }

            switch(keyCode) {
                case 37: // left
                    type == 'day' ? (d -= 1) : '';
                    type == 'month' ? (m -= 1) : '';
                    type == 'year' ? (y -= 1) : '';
                    break;
                case 38: // up
                    type == 'day' ? (d -= 7) : '';
                    type == 'month' ? (m -= 3) : '';
                    type == 'year' ? (y -= 4) : '';
                    break;
                case 39: // right
                    type == 'day' ? (d += 1) : '';
                    type == 'month' ? (m += 1) : '';
                    type == 'year' ? (y += 1) : '';
                    break;
                case 40: // down
                    type == 'day' ? (d += 7) : '';
                    type == 'month' ? (m += 3) : '';
                    type == 'year' ? (y += 4) : '';
                    break;
            }

            var nd = new Date(y,m,d);
            if (nd.getTime() < this.minTime) {
                nd = this.minDate;
            } else if (nd.getTime() > this.maxTime) {
                nd = this.maxDate;
            }

            this.focused = nd;

        },

        _getFocusedDate: function () {
            var focused  = this.focused || this.selectedDates[this.selectedDates.length - 1],
                d = this.parsedDate;

            if (!focused) {
                switch (this.view) {
                    case 'days':
                        focused = new Date(d.year, d.month, new Date().getDate());
                        break;
                    case 'months':
                        focused = new Date(d.year, d.month, 1);
                        break;
                    case 'years':
                        focused = new Date(d.year, 0, 1);
                        break;
                }
            }

            return focused;
        },

        _getCell: function (date, type) {
            type = type || this.cellType;

            var d = datepicker.getParsedDate(date),
                selector = '.datepicker--cell[data-year="' + d.year + '"]',
                $cell;

            switch (type) {
                case 'month':
                    selector = '[data-month="' + d.month + '"]';
                    break;
                case 'day':
                    selector += '[data-month="' + d.month + '"][data-date="' + d.date + '"]';
                    break;
            }
            $cell = this.views[this.currentView].$el.find(selector);

            return $cell.length ? $cell : $('');
        },

        destroy: function () {
            var _this = this;
            _this.$el
                .off('.adp')
                .data('datepicker', '');

            _this.selectedDates = [];
            _this.focused = '';
            _this.views = {};
            _this.keys = [];
            _this.minRange = '';
            _this.maxRange = '';

            if (_this.opts.inline || !_this.elIsInput) {
                _this.$datepicker.closest('.datepicker-inline').remove();
            } else {
                _this.$datepicker.remove();
            }
        },

        _handleAlreadySelectedDates: function (alreadySelected, selectedDate) {
            if (this.opts.range) {
                if (!this.opts.toggleSelected) {
                    // Add possibility to select same date when range is true
                    if (this.selectedDates.length != 2) {
                        this._trigger('clickCell', selectedDate);
                    }
                } else {
                    this.removeDate(selectedDate);
                }
            } else if (this.opts.toggleSelected){
                this.removeDate(selectedDate);
            }

            // Change last selected date to be able to change time when clicking on this cell
            if (!this.opts.toggleSelected) {
                this.lastSelectedDate = alreadySelected;
                if (this.opts.timepicker) {
                    this.timepicker._setTime(alreadySelected);
                    this.timepicker.update();
                }
            }
        },

        _onShowEvent: function (e) {
            if (!this.visible) {
                this.show();
            }
        },

        _onBlur: function () {
            if (!this.inFocus && this.visible) {
                this.hide();
            }
        },

        _onMouseDownDatepicker: function (e) {
            this.inFocus = true;
        },

        _onMouseUpDatepicker: function (e) {
            this.inFocus = false;
            e.originalEvent.inFocus = true;
            if (!e.originalEvent.timepickerFocus) this.$el.focus();
        },

        _onKeyUpGeneral: function (e) {
            var val = this.$el.val();

            if (!val) {
                this.clear();
            }
        },

        _onResize: function () {
            if (this.visible) {
                this.setPosition();
            }
        },

        _onMouseUpBody: function (e) {
            if (e.originalEvent.inFocus) return;

            if (this.visible && !this.inFocus) {
                this.hide();
            }
        },

        _onMouseUpEl: function (e) {
            e.originalEvent.inFocus = true;
            setTimeout(this._onKeyUpGeneral.bind(this),4);
        },

        _onKeyDown: function (e) {
            var code = e.which;
            this._registerKey(code);

            // Arrows
            if (code >= 37 && code <= 40) {
                e.preventDefault();
                this._focusNextCell(code);
            }

            // Enter
            if (code == 13) {
                if (this.focused) {
                    if (this._getCell(this.focused).hasClass('-disabled-')) return;
                    if (this.view != this.opts.minView) {
                        this.down()
                    } else {
                        var alreadySelected = this._isSelected(this.focused, this.cellType);

                        if (!alreadySelected) {
                            if (this.timepicker) {
                                this.focused.setHours(this.timepicker.hours);
                                this.focused.setMinutes(this.timepicker.minutes);
                            }
                            this.selectDate(this.focused);
                            return;
                        }
                        this._handleAlreadySelectedDates(alreadySelected, this.focused)
                    }
                }
            }

            // Esc
            if (code == 27) {
                this.hide();
            }
        },

        _onKeyUp: function (e) {
            var code = e.which;
            this._unRegisterKey(code);
        },

        _onHotKey: function (e, hotKey) {
            this._handleHotKey(hotKey);
        },

        _onMouseEnterCell: function (e) {
            var $cell = $(e.target).closest('.datepicker--cell'),
                date = this._getDateFromCell($cell);

            // Prevent from unnecessary rendering and setting new currentDate
            this.silent = true;

            if (this.focused) {
                this.focused = ''
            }

            $cell.addClass('-focus-');

            this.focused = date;
            this.silent = false;

            if (this.opts.range && this.selectedDates.length == 1) {
                this.minRange = this.selectedDates[0];
                this.maxRange = '';
                if (datepicker.less(this.minRange, this.focused)) {
                    this.maxRange = this.minRange;
                    this.minRange = '';
                }
                this.views[this.currentView]._update();
            }
        },

        _onMouseLeaveCell: function (e) {
            var $cell = $(e.target).closest('.datepicker--cell');

            $cell.removeClass('-focus-');

            this.silent = true;
            this.focused = '';
            this.silent = false;
        },

        _onTimeChange: function (e, h, m) {
            var date = new Date(),
                selectedDates = this.selectedDates,
                selected = false;

            if (selectedDates.length) {
                selected = true;
                date = this.lastSelectedDate;
            }

            date.setHours(h);
            date.setMinutes(m);

            if (!selected && !this._getCell(date).hasClass('-disabled-')) {
                this.selectDate(date);
            } else {
                this._setInputValue();
                if (this.opts.onSelect) {
                    this._triggerOnChange();
                }
            }
        },

        _onClickCell: function (e, date) {
            if (this.timepicker) {
                date.setHours(this.timepicker.hours);
                date.setMinutes(this.timepicker.minutes);
            }
            this.selectDate(date);
        },

        set focused(val) {
            if (!val && this.focused) {
                var $cell = this._getCell(this.focused);

                if ($cell.length) {
                    $cell.removeClass('-focus-')
                }
            }
            this._focused = val;
            if (this.opts.range && this.selectedDates.length == 1) {
                this.minRange = this.selectedDates[0];
                this.maxRange = '';
                if (datepicker.less(this.minRange, this._focused)) {
                    this.maxRange = this.minRange;
                    this.minRange = '';
                }
            }
            if (this.silent) return;
            this.date = val;
        },

        get focused() {
            return this._focused;
        },

        get parsedDate() {
            return datepicker.getParsedDate(this.date);
        },

        set date (val) {
            if (!(val instanceof Date)) return;

            this.currentDate = val;

            if (this.inited && !this.silent) {
                this.views[this.view]._render();
                this.nav._render();
                if (this.visible && this.elIsInput) {
                    this.setPosition();
                }
            }
            return val;
        },

        get date () {
            return this.currentDate
        },

        set view (val) {
            this.viewIndex = this.viewIndexes.indexOf(val);

            if (this.viewIndex < 0) {
                return;
            }

            this.prevView = this.currentView;
            this.currentView = val;

            if (this.inited) {
                if (!this.views[val]) {
                    this.views[val] = new  $.fn.datepicker.Body(this, val, this.opts)
                } else {
                    this.views[val]._render();
                }

                this.views[this.prevView].hide();
                this.views[val].show();
                this.nav._render();

                if (this.opts.onChangeView) {
                    this.opts.onChangeView(val)
                }
                if (this.elIsInput && this.visible) this.setPosition();
            }

            return val
        },

        get view() {
            return this.currentView;
        },

        get cellType() {
            return this.view.substring(0, this.view.length - 1)
        },

        get minTime() {
            var min = datepicker.getParsedDate(this.minDate);
            return new Date(min.year, min.month, min.date).getTime()
        },

        get maxTime() {
            var max = datepicker.getParsedDate(this.maxDate);
            return new Date(max.year, max.month, max.date).getTime()
        },

        get curDecade() {
            return datepicker.getDecade(this.date)
        }
    };

    //  Utils
    // -------------------------------------------------

    datepicker.getDaysCount = function (date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    datepicker.getParsedDate = function (date) {
        return {
            year: date.getFullYear(),
            month: date.getMonth(),
            fullMonth: (date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1, // One based
            date: date.getDate(),
            fullDate: date.getDate() < 10 ? '0' + date.getDate() : date.getDate(),
            day: date.getDay(),
            hours: date.getHours(),
            fullHours:  date.getHours() < 10 ? '0' + date.getHours() :  date.getHours() ,
            minutes: date.getMinutes(),
            fullMinutes:  date.getMinutes() < 10 ? '0' + date.getMinutes() :  date.getMinutes()
        }
    };

    datepicker.getDecade = function (date) {
        var firstYear = Math.floor(date.getFullYear() / 10) * 10;

        return [firstYear, firstYear + 9];
    };

    datepicker.template = function (str, data) {
        return str.replace(/#\{([\w]+)\}/g, function (source, match) {
            if (data[match] || data[match] === 0) {
                return data[match]
            }
        });
    };

    datepicker.isSame = function (date1, date2, type) {
        if (!date1 || !date2) return false;
        var d1 = datepicker.getParsedDate(date1),
            d2 = datepicker.getParsedDate(date2),
            _type = type ? type : 'day',

            conditions = {
                day: d1.date == d2.date && d1.month == d2.month && d1.year == d2.year,
                month: d1.month == d2.month && d1.year == d2.year,
                year: d1.year == d2.year
            };

        return conditions[_type];
    };

    datepicker.less = function (dateCompareTo, date, type) {
        if (!dateCompareTo || !date) return false;
        return date.getTime() < dateCompareTo.getTime();
    };

    datepicker.bigger = function (dateCompareTo, date, type) {
        if (!dateCompareTo || !date) return false;
        return date.getTime() > dateCompareTo.getTime();
    };

    datepicker.getLeadingZeroNum = function (num) {
        return parseInt(num) < 10 ? '0' + num : num;
    };

    /**
     * Returns copy of date with hours and minutes equals to 0
     * @param date {Date}
     */
    datepicker.resetTime = function (date) {
        if (typeof date != 'object') return;
        date = datepicker.getParsedDate(date);
        return new Date(date.year, date.month, date.date)
    };

    $.fn.datepicker = function ( options ) {
        return this.each(function () {
            if (!$.data(this, pluginName)) {
                $.data(this,  pluginName,
                    new Datepicker( this, options ));
            } else {
                var _this = $.data(this, pluginName);

                _this.opts = $.extend(true, _this.opts, options);
                _this.update();
            }
        });
    };

    $.fn.datepicker.Constructor = Datepicker;

    $.fn.datepicker.language = {
        ru: {
            days: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
            daysShort: ['Вос','Пон','Вто','Сре','Чет','Пят','Суб'],
            daysMin: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
            months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
            monthsShort: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
            today: 'Сегодня',
            clear: 'Очистить',
            dateFormat: 'dd.mm.yyyy',
            timeFormat: 'hh:ii',
            firstDay: 1
        }
    };

    $(function () {
        $(autoInitSelector).datepicker();
    })

})();

;(function () {
    var templates = {
        days:'' +
        '<div class="datepicker--days datepicker--body">' +
        '<div class="datepicker--days-names"></div>' +
        '<div class="datepicker--cells datepicker--cells-days"></div>' +
        '</div>',
        months: '' +
        '<div class="datepicker--months datepicker--body">' +
        '<div class="datepicker--cells datepicker--cells-months"></div>' +
        '</div>',
        years: '' +
        '<div class="datepicker--years datepicker--body">' +
        '<div class="datepicker--cells datepicker--cells-years"></div>' +
        '</div>'
        },
        datepicker = $.fn.datepicker,
        dp = datepicker.Constructor;

    datepicker.Body = function (d, type, opts) {
        this.d = d;
        this.type = type;
        this.opts = opts;
        this.$el = $('');

        if (this.opts.onlyTimepicker) return;
        this.init();
    };

    datepicker.Body.prototype = {
        init: function () {
            this._buildBaseHtml();
            this._render();

            this._bindEvents();
        },

        _bindEvents: function () {
            this.$el.on('click', '.datepicker--cell', $.proxy(this._onClickCell, this));
        },

        _buildBaseHtml: function () {
            this.$el = $(templates[this.type]).appendTo(this.d.$content);
            this.$names = $('.datepicker--days-names', this.$el);
            this.$cells = $('.datepicker--cells', this.$el);
        },

        _getDayNamesHtml: function (firstDay, curDay, html, i) {
            curDay = curDay != undefined ? curDay : firstDay;
            html = html ? html : '';
            i = i != undefined ? i : 0;

            if (i > 7) return html;
            if (curDay == 7) return this._getDayNamesHtml(firstDay, 0, html, ++i);

            html += '<div class="datepicker--day-name' + (this.d.isWeekend(curDay) ? " -weekend-" : "") + '">' + this.d.loc.daysMin[curDay] + '</div>';

            return this._getDayNamesHtml(firstDay, ++curDay, html, ++i);
        },

        _getCellContents: function (date, type) {
            var classes = "datepicker--cell datepicker--cell-" + type,
                currentDate = new Date(),
                parent = this.d,
                minRange = dp.resetTime(parent.minRange),
                maxRange = dp.resetTime(parent.maxRange),
                opts = parent.opts,
                d = dp.getParsedDate(date),
                render = {},
                html = d.date;

            switch (type) {
                case 'day':
                    if (parent.isWeekend(d.day)) classes += " -weekend-";
                    if (d.month != this.d.parsedDate.month) {
                        classes += " -other-month-";
                        if (!opts.selectOtherMonths) {
                            classes += " -disabled-";
                        }
                        if (!opts.showOtherMonths) html = '';
                    }
                    break;
                case 'month':
                    html = parent.loc[parent.opts.monthsField][d.month];
                    break;
                case 'year':
                    var decade = parent.curDecade;
                    html = d.year;
                    if (d.year < decade[0] || d.year > decade[1]) {
                        classes += ' -other-decade-';
                        if (!opts.selectOtherYears) {
                            classes += " -disabled-";
                        }
                        if (!opts.showOtherYears) html = '';
                    }
                    break;
            }

            if (opts.onRenderCell) {
                render = opts.onRenderCell(date, type) || {};
                html = render.html ? render.html : html;
                classes += render.classes ? ' ' + render.classes : '';
            }

            if (opts.range) {
                if (dp.isSame(minRange, date, type)) classes += ' -range-from-';
                if (dp.isSame(maxRange, date, type)) classes += ' -range-to-';

                if (parent.selectedDates.length == 1 && parent.focused) {
                    if (
                        (dp.bigger(minRange, date) && dp.less(parent.focused, date)) ||
                        (dp.less(maxRange, date) && dp.bigger(parent.focused, date)))
                    {
                        classes += ' -in-range-'
                    }

                    if (dp.less(maxRange, date) && dp.isSame(parent.focused, date)) {
                        classes += ' -range-from-'
                    }
                    if (dp.bigger(minRange, date) && dp.isSame(parent.focused, date)) {
                        classes += ' -range-to-'
                    }

                } else if (parent.selectedDates.length == 2) {
                    if (dp.bigger(minRange, date) && dp.less(maxRange, date)) {
                        classes += ' -in-range-'
                    }
                }
            }


            if (dp.isSame(currentDate, date, type)) classes += ' -current-';
            if (parent.focused && dp.isSame(date, parent.focused, type)) classes += ' -focus-';
            if (parent._isSelected(date, type)) classes += ' -selected-';
            if (!parent._isInRange(date, type) || render.disabled) classes += ' -disabled-';

            return {
                html: html,
                classes: classes
            }
        },

        /**
         * Calculates days number to render. Generates days html and returns it.
         * @param {object} date - Date object
         * @returns {string}
         * @private
         */
        _getDaysHtml: function (date) {
            var totalMonthDays = dp.getDaysCount(date),
                firstMonthDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay(),
                lastMonthDay = new Date(date.getFullYear(), date.getMonth(), totalMonthDays).getDay(),
                daysFromPevMonth = firstMonthDay - this.d.loc.firstDay,
                daysFromNextMonth = 6 - lastMonthDay + this.d.loc.firstDay;

            daysFromPevMonth = daysFromPevMonth < 0 ? daysFromPevMonth + 7 : daysFromPevMonth;
            daysFromNextMonth = daysFromNextMonth > 6 ? daysFromNextMonth - 7 : daysFromNextMonth;

            var startDayIndex = -daysFromPevMonth + 1,
                m, y,
                html = '';

            for (var i = startDayIndex, max = totalMonthDays + daysFromNextMonth; i <= max; i++) {
                y = date.getFullYear();
                m = date.getMonth();

                html += this._getDayHtml(new Date(y, m, i))
            }

            return html;
        },

        _getDayHtml: function (date) {
           var content = this._getCellContents(date, 'day');

            return '<div class="' + content.classes + '" ' +
                'data-date="' + date.getDate() + '" ' +
                'data-month="' + date.getMonth() + '" ' +
                'data-year="' + date.getFullYear() + '">' + content.html + '</div>';
        },

        /**
         * Generates months html
         * @param {object} date - date instance
         * @returns {string}
         * @private
         */
        _getMonthsHtml: function (date) {
            var html = '',
                d = dp.getParsedDate(date),
                i = 0;

            while(i < 12) {
                html += this._getMonthHtml(new Date(d.year, i));
                i++
            }

            return html;
        },

        _getMonthHtml: function (date) {
            var content = this._getCellContents(date, 'month');

            return '<div class="' + content.classes + '" data-month="' + date.getMonth() + '">' + content.html + '</div>'
        },

        _getYearsHtml: function (date) {
            var d = dp.getParsedDate(date),
                decade = dp.getDecade(date),
                firstYear = decade[0] - 1,
                html = '',
                i = firstYear;

            for (i; i <= decade[1] + 1; i++) {
                html += this._getYearHtml(new Date(i , 0));
            }

            return html;
        },

        _getYearHtml: function (date) {
            var content = this._getCellContents(date, 'year');

            return '<div class="' + content.classes + '" data-year="' + date.getFullYear() + '">' + content.html + '</div>'
        },

        _renderTypes: {
            days: function () {
                var dayNames = this._getDayNamesHtml(this.d.loc.firstDay),
                    days = this._getDaysHtml(this.d.currentDate);

                this.$cells.html(days);
                this.$names.html(dayNames)
            },
            months: function () {
                var html = this._getMonthsHtml(this.d.currentDate);

                this.$cells.html(html)
            },
            years: function () {
                var html = this._getYearsHtml(this.d.currentDate);

                this.$cells.html(html)
            }
        },

        _render: function () {
            if (this.opts.onlyTimepicker) return;
            this._renderTypes[this.type].bind(this)();
        },

        _update: function () {
            var $cells = $('.datepicker--cell', this.$cells),
                _this = this,
                classes,
                $cell,
                date;
            $cells.each(function (cell, i) {
                $cell = $(this);
                date = _this.d._getDateFromCell($(this));
                classes = _this._getCellContents(date, _this.d.cellType);
                $cell.attr('class',classes.classes)
            });
        },

        show: function () {
            if (this.opts.onlyTimepicker) return;
            this.$el.addClass('active');
            this.acitve = true;
        },

        hide: function () {
            this.$el.removeClass('active');
            this.active = false;
        },

        //  Events
        // -------------------------------------------------

        _handleClick: function (el) {
            var date = el.data('date') || 1,
                month = el.data('month') || 0,
                year = el.data('year') || this.d.parsedDate.year,
                dp = this.d;
            // Change view if min view does not reach yet
            if (dp.view != this.opts.minView) {
                dp.down(new Date(year, month, date));
                return;
            }
            // Select date if min view is reached
            var selectedDate = new Date(year, month, date),
                alreadySelected = this.d._isSelected(selectedDate, this.d.cellType);

            if (!alreadySelected) {
                dp._trigger('clickCell', selectedDate);
                return;
            }

            dp._handleAlreadySelectedDates.bind(dp, alreadySelected, selectedDate)();

        },

        _onClickCell: function (e) {
            var $el = $(e.target).closest('.datepicker--cell');

            if ($el.hasClass('-disabled-')) return;

            this._handleClick.bind(this)($el);
        }
    };
})();

;(function () {
    var template = '' +
        '<div class="datepicker--nav-action" data-action="prev">#{prevHtml}</div>' +
        '<div class="datepicker--nav-title">#{title}</div>' +
        '<div class="datepicker--nav-action" data-action="next">#{nextHtml}</div>',
        buttonsContainerTemplate = '<div class="datepicker--buttons"></div>',
        button = '<span class="datepicker--button" data-action="#{action}">#{label}</span>',
        datepicker = $.fn.datepicker,
        dp = datepicker.Constructor;

    datepicker.Navigation = function (d, opts) {
        this.d = d;
        this.opts = opts;

        this.$buttonsContainer = '';

        this.init();
    };

    datepicker.Navigation.prototype = {
        init: function () {
            this._buildBaseHtml();
            this._bindEvents();
        },

        _bindEvents: function () {
            this.d.$nav.on('click', '.datepicker--nav-action', $.proxy(this._onClickNavButton, this));
            this.d.$nav.on('click', '.datepicker--nav-title', $.proxy(this._onClickNavTitle, this));
            this.d.$datepicker.on('click', '.datepicker--button', $.proxy(this._onClickNavButton, this));
        },

        _buildBaseHtml: function () {
            if (!this.opts.onlyTimepicker) {
                this._render();
            }
            this._addButtonsIfNeed();
        },

        _addButtonsIfNeed: function () {
            if (this.opts.todayButton) {
                this._addButton('today')
            }
            if (this.opts.clearButton) {
                this._addButton('clear')
            }
        },

        _render: function () {
            var title = this._getTitle(this.d.currentDate),
                html = dp.template(template, $.extend({title: title}, this.opts));
            this.d.$nav.html(html);
            if (this.d.view == 'years') {
                $('.datepicker--nav-title', this.d.$nav).addClass('-disabled-');
            }
            this.setNavStatus();
        },

        _getTitle: function (date) {
            return this.d.formatDate(this.opts.navTitles[this.d.view], date)
        },

        _addButton: function (type) {
            if (!this.$buttonsContainer.length) {
                this._addButtonsContainer();
            }

            var data = {
                    action: type,
                    label: this.d.loc[type]
                },
                html = dp.template(button, data);

            if ($('[data-action=' + type + ']', this.$buttonsContainer).length) return;
            this.$buttonsContainer.append(html);
        },

        _addButtonsContainer: function () {
            this.d.$datepicker.append(buttonsContainerTemplate);
            this.$buttonsContainer = $('.datepicker--buttons', this.d.$datepicker);
        },

        setNavStatus: function () {
            if (!(this.opts.minDate || this.opts.maxDate) || !this.opts.disableNavWhenOutOfRange) return;

            var date = this.d.parsedDate,
                m = date.month,
                y = date.year,
                d = date.date;

            switch (this.d.view) {
                case 'days':
                    if (!this.d._isInRange(new Date(y, m-1, 1), 'month')) {
                        this._disableNav('prev')
                    }
                    if (!this.d._isInRange(new Date(y, m+1, 1), 'month')) {
                        this._disableNav('next')
                    }
                    break;
                case 'months':
                    if (!this.d._isInRange(new Date(y-1, m, d), 'year')) {
                        this._disableNav('prev')
                    }
                    if (!this.d._isInRange(new Date(y+1, m, d), 'year')) {
                        this._disableNav('next')
                    }
                    break;
                case 'years':
                    var decade = dp.getDecade(this.d.date);
                    if (!this.d._isInRange(new Date(decade[0] - 1, 0, 1), 'year')) {
                        this._disableNav('prev')
                    }
                    if (!this.d._isInRange(new Date(decade[1] + 1, 0, 1), 'year')) {
                        this._disableNav('next')
                    }
                    break;
            }
        },

        _disableNav: function (nav) {
            $('[data-action="' + nav + '"]', this.d.$nav).addClass('-disabled-')
        },

        _activateNav: function (nav) {
            $('[data-action="' + nav + '"]', this.d.$nav).removeClass('-disabled-')
        },

        _onClickNavButton: function (e) {
            var $el = $(e.target).closest('[data-action]'),
                action = $el.data('action');

            this.d[action]();
        },

        _onClickNavTitle: function (e) {
            if ($(e.target).hasClass('-disabled-')) return;

            if (this.d.view == 'days') {
                return this.d.view = 'months'
            }

            this.d.view = 'years';
        }
    }

})();

;(function () {
    var template = '<!--div class="datepicker--time">' +
        '<div class="datepicker--time-current">' +
        '   <span class="datepicker--time-current-hours">#{hourVisible}</span>' +
        '   <span class="datepicker--time-current-colon">:</span>' +
        '   <span class="datepicker--time-current-minutes">#{minValue}</span>' +
        '</div>' +
        '<div class="datepicker--time-sliders">' +
        '   <div class="datepicker--time-row">' +
        '      <input type="range" name="hours" value="#{hourValue}" min="#{hourMin}" max="#{hourMax}" step="#{hourStep}"/>' +
        '   </div>' +
        '   <div class="datepicker--time-row">' +
        '      <input type="range" name="minutes" value="#{minValue}" min="#{minMin}" max="#{minMax}" step="#{minStep}"/>' +
        '   </div>' +
        '</div-->' +
        '<div class="times" data-id="#{inputID}">' +
            '<div class="times__left  flex">' +
                '<div class="times__left-icon select-clear--js">' +
                    '<svg width="15" height="14" viewBox="0 0 17 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.2618 5.29632C10.3229 5.23932 10.3722 5.17085 10.4069 5.0948C10.4416 5.01875 10.4609 4.93662 10.4638 4.85309C10.4668 4.76956 10.4532 4.68628 10.424 4.60799C10.3947 4.5297 10.3503 4.45795 10.2933 4.39682C10.2363 4.33569 10.1678 4.28638 10.0918 4.25171C10.0157 4.21705 9.9336 4.1977 9.85008 4.19477C9.76655 4.19185 9.68327 4.2054 9.60498 4.23467C9.52669 4.26393 9.45493 4.30832 9.3938 4.36532L7.5318 6.10132L5.7958 4.23868C5.67964 4.11971 5.52154 4.05092 5.35531 4.04705C5.18908 4.04317 5.02794 4.10451 4.90636 4.21794C4.78478 4.33136 4.71243 4.48787 4.70478 4.65397C4.69713 4.82007 4.7548 4.98256 4.86544 5.10668L6.60144 6.96868L4.7388 8.70468C4.67551 8.76109 4.62413 8.82959 4.58769 8.90614C4.55124 8.98269 4.53045 9.06575 4.52655 9.15044C4.52265 9.23514 4.53572 9.31976 4.56498 9.39933C4.59424 9.47891 4.6391 9.55183 4.69694 9.61382C4.75478 9.67582 4.82442 9.72563 4.90178 9.76033C4.97913 9.79503 5.06265 9.81393 5.14741 9.8159C5.23217 9.81788 5.31647 9.8029 5.39536 9.77184C5.47425 9.74078 5.54614 9.69427 5.6068 9.63504L7.4688 7.89968L9.2048 9.76168C9.26086 9.82614 9.32931 9.87865 9.40609 9.91609C9.48287 9.95353 9.56641 9.97512 9.65171 9.97959C9.73702 9.98406 9.82235 9.97131 9.90262 9.9421C9.98289 9.91288 10.0565 9.86781 10.1189 9.80956C10.1814 9.75131 10.2315 9.68108 10.2663 9.60305C10.3011 9.52502 10.3197 9.44079 10.3213 9.35538C10.3228 9.26997 10.3071 9.18513 10.2751 9.10592C10.2431 9.02671 10.1955 8.95474 10.1352 8.89431L8.3998 7.03232L10.2618 5.29632Z" fill="#8EA5B2"/><path fill-rule="evenodd" clip-rule="evenodd" d="M0.5 7C0.5 3.13409 3.63409 0 7.5 0C11.3659 0 14.5 3.13409 14.5 7C14.5 10.8659 11.3659 14 7.5 14C3.63409 14 0.5 10.8659 0.5 7ZM7.5 12.7273C6.74788 12.7273 6.00313 12.5791 5.30827 12.2913C4.6134 12.0035 3.98203 11.5816 3.45021 11.0498C2.91838 10.518 2.49651 9.8866 2.20869 9.19173C1.92087 8.49687 1.77273 7.75212 1.77273 7C1.77273 6.24788 1.92087 5.50313 2.20869 4.80827C2.49651 4.1134 2.91838 3.48203 3.45021 2.95021C3.98203 2.41838 4.6134 1.99651 5.30827 1.70869C6.00313 1.42087 6.74788 1.27273 7.5 1.27273C9.01897 1.27273 10.4757 1.87613 11.5498 2.95021C12.6239 4.02428 13.2273 5.48103 13.2273 7C13.2273 8.51897 12.6239 9.97572 11.5498 11.0498C10.4757 12.1239 9.01897 12.7273 7.5 12.7273Z" fill="#8EA5B2"/></svg>' +
                '</div>' +
                '<div class="times__left-icon select-open--js">' +
                    '<svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.39 1.83398H5.61065C3.59665 1.83398 2.33398 3.25998 2.33398 5.27798V10.7233C2.33398 12.7413 3.58998 14.1673 5.61065 14.1673H11.3893C13.41 14.1673 14.6673 12.7413 14.6673 10.7233V5.27798C14.6673 3.25998 13.41 1.83398 11.39 1.83398Z" stroke="#9EB2BD" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.7612 9.34584L8.50049 7.99718V5.08984" stroke="#9EB2BD" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                '</div>' +
                '<div class="times__left-text times__left-text--js select-open--js">time</div>' +
                '<div class="times__left-select times__select times__select--js">' +
                    '<div class="times__select-option">00:00</div>' +
                    '<div class="times__select-option">00:30</div>' +
                    '<div class="times__select-option">01:00</div>' +
                    '<div class="times__select-option">01:30</div>' +
                    '<div class="times__select-option">02:00</div>' +
                    '<div class="times__select-option">02:30</div>' +
                    '<div class="times__select-option">03:00</div>' +
                    '<div class="times__select-option">03:30</div>' +
                    '<div class="times__select-option">04:00</div>' +
                    '<div class="times__select-option">04:30</div>' +
                    '<div class="times__select-option">05:00</div>' +
                    '<div class="times__select-option">05:30</div>' +
                    '<div class="times__select-option">06:00</div>' +
                    '<div class="times__select-option">06:30</div>' +
                    '<div class="times__select-option">07:00</div>' +
                    '<div class="times__select-option">07:30</div>' +
                    '<div class="times__select-option">08:00</div>' +
                    '<div class="times__select-option">08:30</div>' +
                    '<div class="times__select-option">09:00</div>' +
                    '<div class="times__select-option">09:30</div>' +
                    '<div class="times__select-option">10:00</div>' +
                    '<div class="times__select-option">10:30</div>' +
                    '<div class="times__select-option">11:00</div>' +
                    '<div class="times__select-option">11:30</div>' +
                    '<div class="times__select-option">12:00</div>' +
                    '<div class="times__select-option">12:30</div>' +
                    '<div class="times__select-option">13:00</div>' +
                    '<div class="times__select-option">13:30</div>' +
                    '<div class="times__select-option">14:00</div>' +
                    '<div class="times__select-option">14:30</div>' +
                    '<div class="times__select-option">15:00</div>' +
                    '<div class="times__select-option">15:30</div>' +
                    '<div class="times__select-option">16:00</div>' +
                    '<div class="times__select-option">16:30</div>' +
                    '<div class="times__select-option">17:00</div>' +
                    '<div class="times__select-option">17:30</div>' +
                    '<div class="times__select-option">18:00</div>' +
                    '<div class="times__select-option">18:30</div>' +
                    '<div class="times__select-option">19:00</div>' +
                    '<div class="times__select-option">19:30</div>' +
                    '<div class="times__select-option">20:00</div>' +
                    '<div class="times__select-option">20:30</div>' +
                    '<div class="times__select-option">21:00</div>' +
                    '<div class="times__select-option">21:30</div>' +
                    '<div class="times__select-option">22:00</div>' +
                    '<div class="times__select-option">22:30</div>' +
                    '<div class="times__select-option">23:00</div>' +
                    '<div class="times__select-option">23:30</div>' +
                '</div>' +
            '</div>' +
            '<div class="times__left times__right flex">' +
                '<div class="times__left-text ">timezone</div>' +
                '<div class="times__left-text times__left-text--js  select-timezone-open--js">UTC</div>' +
                '<div class="times__left-select times__select times__select--js ">' +
                    '<div class="times__select-option timezone">ACST</div>' +
                    '<div class="times__select-option timezone">AEST</div>' +
                    '<div class="times__select-option timezone">AKST</div>' +
                    '<div class="times__select-option timezone">AST</div>' +
                    '<div class="times__select-option timezone">AWST</div>' +
                    '<div class="times__select-option timezone">CAT</div>' +
                    '<div class="times__select-option timezone">CET</div>' +
                    '<div class="times__select-option timezone">CST</div>' +
                    '<div class="times__select-option timezone">EAT</div>' +
                    '<div class="times__select-option timezone">EET</div>' +
                    '<div class="times__select-option timezone">EST</div>' +
                    '<div class="times__select-option timezone">GMT</div>' +
                    '<div class="times__select-option timezone">HAST</div>' +
                    '<div class="times__select-option timezone">MSK</div>' +
                    '<div class="times__select-option timezone">MST</div>' +
                    '<div class="times__select-option timezone">NST</div>' +
                    '<div class="times__select-option timezone">PST</div>' +
                    '<div class="times__select-option timezone">UTC</div>' +
                    '<div class="times__select-option timezone">WAT</div>' +
                    '<div class="times__select-option timezone">WET</div>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '</div>',
        datepicker = $.fn.datepicker,
        dp = datepicker.Constructor;

    datepicker.Timepicker = function (inst, opts) {
        this.d = inst;
        this.opts = opts;

        this.init();
    };

    datepicker.Timepicker.prototype = {
        init: function () {
            var input = 'input';
            this._setTime(this.d.date);
            this._buildHTML();

            if (navigator.userAgent.match(/trident/gi)) {
                input = 'change';
            }

            this.d.$el.on('selectDate', this._onSelectDate.bind(this));
            this.$ranges.on(input, this._onChangeRange.bind(this));
            this.$ranges.on('mouseup', this._onMouseUpRange.bind(this));
            this.$ranges.on('mousemove focus ', this._onMouseEnterRange.bind(this));
            this.$ranges.on('mouseout blur', this._onMouseOutRange.bind(this));
        },

        _setTime: function (date) {
            var _date = dp.getParsedDate(date);

            this._handleDate(date);
            this.hours = _date.hours < this.minHours ? this.minHours : _date.hours;
            this.minutes = _date.minutes < this.minMinutes ? this.minMinutes : _date.minutes;
        },

        /**
         * Sets minHours and minMinutes from date (usually it's a minDate)
         * Also changes minMinutes if current hours are bigger then @date hours
         * @param date {Date}
         * @private
         */
        _setMinTimeFromDate: function (date) {
            this.minHours = date.getHours();
            this.minMinutes = date.getMinutes();

            // If, for example, min hours are 10, and current hours are 12,
            // update minMinutes to default value, to be able to choose whole range of values
            if (this.d.lastSelectedDate) {
                if (this.d.lastSelectedDate.getHours() > date.getHours()) {
                    this.minMinutes = this.opts.minMinutes;
                }
            }
        },

        _setMaxTimeFromDate: function (date) {
            this.maxHours = date.getHours();
            this.maxMinutes = date.getMinutes();

            if (this.d.lastSelectedDate) {
                if (this.d.lastSelectedDate.getHours() < date.getHours()) {
                    this.maxMinutes = this.opts.maxMinutes;
                }
            }
        },

        _setDefaultMinMaxTime: function () {
            var maxHours = 23,
                maxMinutes = 59,
                opts = this.opts;

            this.minHours = opts.minHours < 0 || opts.minHours > maxHours ? 0 : opts.minHours;
            this.minMinutes = opts.minMinutes < 0 || opts.minMinutes > maxMinutes ? 0 : opts.minMinutes;
            this.maxHours = opts.maxHours < 0 || opts.maxHours > maxHours ? maxHours : opts.maxHours;
            this.maxMinutes = opts.maxMinutes < 0 || opts.maxMinutes > maxMinutes ? maxMinutes : opts.maxMinutes;
        },

        /**
         * Looks for min/max hours/minutes and if current values
         * are out of range sets valid values.
         * @private
         */
        _validateHoursMinutes: function (date) {
            if (this.hours < this.minHours) {
                this.hours = this.minHours;
            } else if (this.hours > this.maxHours) {
                this.hours = this.maxHours;
            }

            if (this.minutes < this.minMinutes) {
                this.minutes = this.minMinutes;
            } else if (this.minutes > this.maxMinutes) {
                this.minutes = this.maxMinutes;
            }
        },

        _buildHTML: function () {
            var lz = dp.getLeadingZeroNum,
                data = {
                    hourMin: this.minHours,
                    hourMax: lz(this.maxHours),
                    hourStep: this.opts.hoursStep,
                    hourValue: this.hours,
                    hourVisible: lz(this.displayHours),
                    minMin: this.minMinutes,
                    minMax: lz(this.maxMinutes),
                    minStep: this.opts.minutesStep,
                    minValue: lz(this.minutes),
                    inputID: this.opts.inputID,

                },
                _template = dp.template(template, data);


            this.$timepicker = $(_template).appendTo(this.d.$datepicker);
            this.$ranges = $('[type="range"]', this.$timepicker);
            this.$hours = $('[name="hours"]', this.$timepicker);
            this.$minutes = $('[name="minutes"]', this.$timepicker);
            this.$hoursText = $('.datepicker--time-current-hours', this.$timepicker);
            this.$minutesText = $('.datepicker--time-current-minutes', this.$timepicker);

            if (this.d.ampm) {
                this.$ampm = $('<span class="datepicker--time-current-ampm">')
                    .appendTo($('.datepicker--time-current', this.$timepicker))
                    .html(this.dayPeriod);

                this.$timepicker.addClass('-am-pm-');
            }
        },

        _updateCurrentTime: function () {
            var h =  dp.getLeadingZeroNum(this.displayHours),
                m = dp.getLeadingZeroNum(this.minutes);

            this.$hoursText.html(h);
            this.$minutesText.html(m);

            if (this.d.ampm) {
                this.$ampm.html(this.dayPeriod);
            }
        },

        _updateRanges: function () {
            this.$hours.attr({
                min: this.minHours,
                max: this.maxHours
            }).val(this.hours);

            this.$minutes.attr({
                min: this.minMinutes,
                max: this.maxMinutes
            }).val(this.minutes)
        },

        /**
         * Sets minHours, minMinutes etc. from date. If date is not passed, than sets
         * values from options
         * @param [date] {object} - Date object, to get values from
         * @private
         */
        _handleDate: function (date) {
            this._setDefaultMinMaxTime();
            if (date) {
                if (dp.isSame(date, this.d.opts.minDate)) {
                    this._setMinTimeFromDate(this.d.opts.minDate);
                } else if (dp.isSame(date, this.d.opts.maxDate)) {
                    this._setMaxTimeFromDate(this.d.opts.maxDate);
                }
            }

            this._validateHoursMinutes(date);
        },

        update: function () {
            this._updateRanges();
            this._updateCurrentTime();
        },

        /**
         * Calculates valid hour value to display in text input and datepicker's body.
         * @param date {Date|Number} - date or hours
         * @param [ampm] {Boolean} - 12 hours mode
         * @returns {{hours: *, dayPeriod: string}}
         * @private
         */
        _getValidHoursFromDate: function (date, ampm) {
            var d = date,
                hours = date;

            if (date instanceof Date) {
                d = dp.getParsedDate(date);
                hours = d.hours;
            }

            var _ampm = ampm || this.d.ampm,
                dayPeriod = 'am';

            if (_ampm) {
                switch(true) {
                    case hours == 0:
                        hours = 12;
                        break;
                    case hours == 12:
                        dayPeriod = 'pm';
                        break;
                    case hours > 11:
                        hours = hours - 12;
                        dayPeriod = 'pm';
                        break;
                    default:
                        break;
                }
            }

            return {
                hours: hours,
                dayPeriod: dayPeriod
            }
        },

        set hours (val) {
            this._hours = val;

            var displayHours = this._getValidHoursFromDate(val);

            this.displayHours = displayHours.hours;
            this.dayPeriod = displayHours.dayPeriod;
        },

        get hours() {
            return this._hours;
        },

        //  Events
        // -------------------------------------------------

        _onChangeRange: function (e) {
            var $target = $(e.target),
                name = $target.attr('name');

            this.d.timepickerIsActive = true;

            this[name] = $target.val();
            this._updateCurrentTime();
            this.d._trigger('timeChange', [this.hours, this.minutes]);

            this._handleDate(this.d.lastSelectedDate);
            this.update()
        },

        _onSelectDate: function (e, data) {
            this._handleDate(data);
            this.update();
        },

        _onMouseEnterRange: function (e) {
            var name = $(e.target).attr('name');
            $('.datepicker--time-current-' + name, this.$timepicker).addClass('-focus-');
        },

        _onMouseOutRange: function (e) {
            var name = $(e.target).attr('name');
            if (this.d.inFocus) return; // Prevent removing focus when mouse out of range slider
            $('.datepicker--time-current-' + name, this.$timepicker).removeClass('-focus-');
        },

        _onMouseUpRange: function (e) {
            this.d.timepickerIsActive = false;
        }
    };
})();
 })(window, jQuery);




$( document ).ready(function() {
  // Main menu open
  if ($(".filter__btn").length > 0) {
    $(".filter__btn").on("click", function(){
      $("body").addClass("bg-lock");
      $(".filter__bottom").addClass("active");
    });
    $(".filter__closed").on("click", function(){
      $("body").removeClass("bg-lock");
      $(".filter__bottom").removeClass("active");
    });
  }

  $(".filter__checkbox").on("change", function(){
    if($(this).find("input").prop("checked")){
      $(this).addClass('active');
    } else {
      $(this).removeClass('active');
    }
    var name = $(this).find("input").attr("name");
    var nameClass = $("."+name);
    nameClass.toggleClass("visible");
    if ($(window).width() > 1010) {
      var mainChenge = $(this).find("input").data("chenge");
      if($('.filter__checkbox input[data-chenge="1"]').prop("checked") || $('.filter__checkbox input[data-chenge="2"]').prop("checked")){
        $(".catalog__body").removeClass('hidden');
      } else {
        $(".catalog__body").addClass('hidden');
      }
    }
  });


  $(".filter-sort--js").on("click", function(event){
    event.preventDefault();

    var value = $(this).find('span').text();
    $('.filter-sort--js.active').not(this).removeClass('active');
    $('.select-filter--js').removeClass('select_active');
    if($(this).hasClass('active')){

      if($(this).hasClass('desc')){
        $(this).removeClass('desc');
        $(this).addClass('asc');
        $('.sort_by--js').val('asc');
        $('.sort_order--js').val(value);
      } else if($(this).hasClass('asc')){
        $(this).removeClass('active');
        $(this).removeClass('asc');
        $('.sort_by--js').val('undefined');
        $('.sort_order--js').val('undefined');
      }

    } else {
      $(this).addClass('active desc');
      $('.sort_by--js').val('desc');
      $('.sort_order--js').val(value);
    }
    var sort_order = $('.sort_order--js').val();
    var sort_by = $('.sort_by--js').val();
  });


  if ($(".filter__type").length > 0) {
    var min_width = 1010;
    $(window).on('resize', function () {
      var new_width = $(window).width();
      if (new_width <= min_width) {
        var $nav = $('.filter__type'),
          $line = $('<div class="type-bg">'),
          $activeLi,
          lineWidth,
          liPos;
        if ($('.type-bg').length == 0) {
          $line.appendTo($nav)
        }
        function refresh() {
          if($nav.find('.filter__checkbox.actives').length==0){
            $activeLi = $nav.find('.filter__checkbox').first();
          } else {
            $activeLi = $nav.find('.filter__checkbox.actives');
          }
          lineWidth = $activeLi.outerWidth();
          liPos = $activeLi.position().left;
        }
        refresh();
        $nav.css('position','relative');
        //line setup
        function lineSet() {
          if($nav.find('.filter__checkbox.actives').length>0){
            $line.animate({
              'left':liPos,
            }, 0);
          }
        }
        lineSet();
        $nav.find('.filter__checkbox').on("click", function() {
          //alert($nav.find('.filter__checkbox.actives').length);
          if($nav.find('.filter__checkbox.actives').length==0){
            $(this).addClass('active');
          }
          $(".type-bg").addClass("visible");
          $activeLi.removeClass('actives');
          $(this).addClass('actives');
          refresh();
          lineSet();
          var mainChenge = $(this).find("input").data("chenge");
          if(mainChenge == '2'){
            $(".type-bg").addClass("type-bg_orange");
          } else {
            $(".type-bg").removeClass("type-bg_orange");
          }
        });
        if ($('.filter__checkbox.actives').length == 0) {
          $('.filter__checkbox').first().click();
        }
      }
    }).trigger('resize');
  }

  if ($(".filter").length > 0) {
    $(window).on('resize', function () {
      var new_width = $(window).outerWidth();
      var min_width = 1010;
      var container = $('.filter');
      if (new_width <= min_width) {
        $('.filter__prices').insertBefore($('.filter__category'));
        $('.filter__sort').insertAfter($('.filter__btn'));
        $('.filter__verified').insertAfter($('.filter__category'));
      }
      if (new_width > min_width) {
        $('.filter__prices').insertAfter($('.filter__top-first'));
        $('.filter__sort').insertAfter($('.filter__category'));
        $('.filter__verified').insertAfter($('.filter__type'));
      }
    }).trigger('resize');
  }
});

$(document).ready(function () {
	$(".filter__bottom").addClass("filter__bottom_block");
});

$( document ).ready(function() {
	if($('.catalog').length > 0){
		setTimeout(function(){
			var positionElement = $('.catalog').offset().top;
			if($(document).scrollTop()>0){
				$('.filter__fixed').removeClass('bottom delay-6');
					$('.filter').addClass('fixed');
			}
			$(document).on('scroll', function (){
				var scroll = $(document).scrollTop();
				if(scroll  > positionElement  ) {
					$('.filter').addClass('fixed')
				} else {
					$('.filter').removeClass('fixed')
				}
			})
		}, 200);
	}
});

if ($(".file__link").length > 0) {
	var files;
	$('.file__value').on('change', function(){
		files = $(this).prop('files');
		if (files.length == 0) {
			$(this).prev().text('Select a file');
		} else if (files.length == 1) {
			$(this).prev().text(files[0].name);
			$(this).prev().addClass("active");
			$(this).parents('.file').find('.file__caption').addClass("active");
		} else if (files.length > 1) {
			$(this).prev().text(files.length + ' files selected');
			$(this).prev().addClass("active");
			$(this).parents('.file').find('.file__caption').addClass("active");
		}
	});
}

if ($(".date-from, .date-to").length > 0) {
	$.fn.datepicker.language['en'] =  {
		days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
		daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
		daysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
		months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
		monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
		today: "Today",
		clear: "Clear",
		dateFormat: 'dd.mm.yyyy',
		timeFormat: 'hh:ii',
		//firstDay: 1
	};

	$('.my-datepicker').datepicker({
		classes: "dates",
		language: "en",
		navTitles: {
			days: 'MM',
		},
		/*minDate: new Date(),*/
		timepicker: true,
		minutesStep: 1,
		minMinutes: 0,
		autoClose: false,
		dateTimeSeparator: ",",
		inputID: 3
	});

	var date_from = $('.date-from ').datepicker({
		classes: "dates",
		language: "en",
		navTitles: {
			days: 'MM',
		},
		timepicker: true,
		minutesStep: 1,
		minMinutes: 0,
		dateTimeSeparator: ",",
		multipleDates: false,
		inputID: 1,
		onSelect(formattedDate, date, inst){
			var time = $(".times[data-id='"+this.inputID+"']").find('.select-open--js').text();
			var timeZone = $(".times[data-id='"+this.inputID+"']").find('.select-timezone-open--js').text();
			//time = time.slice(0,5);

			formattedDate = formattedDate.substring(0, formattedDate.indexOf(','));
			if(time != 'time'){
				$(inst.$el).val(formattedDate + ', '+time+', '+timeZone);
			} else {
				$(inst.$el).val(formattedDate);
				$(".times[data-id='"+this.inputID+"']").find('.times__left:not(.times__right)').addClass('error');
			}
		}
	});

	var date_to = $('.date-to ').datepicker({
		multipleDates: false,
		classes: "dates",
		language: "en",
		navTitles: {
			days: 'MM',
		},
		timepicker: true,
		minutesStep: 1,
		minMinutes: 0,
		dateTimeSeparator: ",",
		multipleDates: false,
		inputID: 2,
		minDate: new Date(),
		onSelect(formattedDate, date, inst){
			var time = $(".times[data-id='"+this.inputID+"']").find('.select-open--js').text();
			var timeZone = $(".times[data-id='"+this.inputID+"']").find('.select-timezone-open--js').text();
			time = time.slice(0,5);

			formattedDate = formattedDate.substring(0, formattedDate.indexOf(','));
			if(time != 'time'){
				$(inst.$el).val(formattedDate + ', '+time+', '+timeZone);
			} else {
				$(inst.$el).val(formattedDate);
				$(".times[data-id='"+this.inputID+"']").find('.times__left:not(.times__right)').addClass('error');
			}
		}
	});

	$('.my-datepicker').on('focus', function () {
		$(this).parent().find('.form__date-icon').addClass("active");
	});
	$('.my-datepicker').on('focusout', function () {
		$(this).parent().find('.form__date-icon').removeClass("active");
	});
}

if ($(window).width() >= 760) {
	function changeRadio(el){
		el.parents('.form__info').find('.form__info-icon').removeClass('center');
		var mainChangeValue = el.data("change");
		if(mainChangeValue == '1'){
			el.parent().parent().find('.form__info-icon').removeClass('active');
			el.parents('.form__info-value').find('[data-change="1"]').prop("checked", false);
			el.parents('.form__info-value').find('[data-change="2"]').prop("checked", true);
		} else {
			el.parent().parent().find('.form__info-icon').addClass('active');
			el.parents('.form__info-value').find('[data-change="2"]').prop("checked", false);
			el.parents('.form__info-value').find('[data-change="1"]').prop("checked", true);
		}
	}

	$(".form__radio_1").on("click", function(event){
		event.preventDefault();
		var mainChange = $(this).parents('.form__info').find('input[data-change="1"]');
		changeRadio($(mainChange));
	});
	$(".form__radio_2").on("click", function(event){
		event.preventDefault();
		var mainChange = $(this).parents('.form__info').find('input[data-change="2"]');
		changeRadio($(mainChange));
	});
	$(".form__info-icon").on("click", function(event){
		event.preventDefault();
		if($(this).parents('.form__info').find('.form__info-icon').hasClass('center')){
			var mainChange = $(this).parents('.form__info').find('input[data-change="2"]');
		} else {
			if($(this).parents('.form__info').find('.form__info-icon').hasClass('active')){
				var mainChange = $(this).parents('.form__info').find('input[data-change="1"]');
			} else {
				var mainChange = $(this).parents('.form__info').find('input[data-change="2"]');
			}
		}
		changeRadio($(mainChange));
	});
}

// Custom Select
$('.form__currency').on("click", function(event) {
	if(!$(this).hasClass('disabled')){
		$('.form__currency').not(this).removeClass('active').find('.form__currency-options').slideUp(50);
		$(this).toggleClass('active');
		$(this).find('.form__currency-options').slideToggle(50);
	}
});


$('.form__currency-options__item').on("click", function() {
	var mainText = $(this).find('.form__currency-options__value').html();
	$(this).parents('.form__currency').find('.form__currency-title__value').html(mainText);
	$(this).parents('.form__currency').addClass("check");
	if($.trim($(this).data('value'))!=''){
		$(this).parents('.form__currency').find('input').val($(this).data('value'));
	}else{
		$(this).parents('.form__currency').find('input').val(mainText);
	}
});


$(document).on("click", function(e) {
	if (!$(e.target).is(".form__currency *")) {
		$('.form__currency').removeClass('active');
		$('.form__currency-options').slideUp(50);
	};
});

// Custom Select
$('.form__promotion').on("click", function(event) {
	if(!$(this).hasClass('disabled')){
		$('.form__promotion').not(this).removeClass('active').find('.form__promotion-options').slideUp(50);
		$(this).toggleClass('active');
		$(this).find('.form__promotion-options').slideToggle(50);
	}
});

$('.form__promotion-options__item').on("click", function() {
	var mainText = $(this).find('.form__promotion-options__caption').html();
	$(this).parents('.form__promotion').find('.form__promotion-caption').html(mainText);
	if($.trim($(this).data('value'))!=''){
		$(this).parents('.form__promotion').find('input').val($(this).data('value'));
	}else{
		$(this).parents('.form__promotion').find('input').val(mainText);
	}
});

$(document).on("click", function(e) {
	if (!$(e.target).is(".form__promotion *")) {
		$('.form__promotion').removeClass('active');
		$('.form__promotion-options').slideUp(50);
	};
});

if ($(".form__info-value").length > 0) {
	var min_width_radio = 760;
	$(window).on('resize', function () {
		var new_width = $(window).width();
		if (new_width <= min_width_radio) {
		var $nav = $('.form__info-value'),
		$lineRadio = $('<div class="type-bg">'),
		$activeLi,
		lineWidth,
		liPos;
		if ($('.type-bg').length == 0) {
			$lineRadio.appendTo($nav);
		}
		function refresh() {
			if($nav.find('.form__radio.actives').length==0){
				$activeLi = $nav.find('.form__radio').first();
			} else {
				$activeLi = $nav.find('.form__radio.actives');
			}
			lineWidth = $activeLi.outerWidth();
			liPos = $activeLi.position().left;
		}
		refresh();
		$nav.css('position','relative');
		//line setup
		function lineSet() {
			if($nav.find('.form__radio.actives').length>0){
				$lineRadio.animate({
					'left':liPos,
				}, 0);
			}
		}
		lineSet();
		$nav.find('.form__radio').on("click", function(event) {
			event.preventDefault();
			//alert($nav.find('.form__radio.actives').length);
			if($nav.find('.form__radio.actives').length==0){
				$(this).addClass('active');
			}
			$(".type-bg").addClass("visible");
			$activeLi.removeClass('actives');
			$(this).addClass('actives');
			refresh();
			lineSet();
			var mainChenge = $(this).find("input").data("chenge");
			if(mainChenge == '2'){
				$(".type-bg").addClass("type-bg_orange");
			} else {
				$(".type-bg").removeClass("type-bg_orange");
			}
		});
		if ($('.form__radio.actives').length == 0) {
			$('.form__radio').first().click();
		}
		}
	}).trigger('resize');
}

/*Focus*/
if ($(".password").length > 0) {
	$('.password .field').on('focus', function () {
		$(this).parent().addClass("active");
		$(this).parent().find(".password__icon").addClass("visible");
	});
	$('.password .field').on('blur', function () {
		let email = $(this).val();
		if (email.length == 0) {
			$(this).parent().removeClass("active");
			$(this).parent().find(".password__icon").removeClass("visible");
		} else {
			$(this).parent().addClass("active");
			$(this).parent().find(".password__icon").addClass("visible");
		}
	});
}


$("body").on('click', '.password__icon:not(.active)', function () {
	$(this).addClass("active");
	$(this).parent().find('.field').attr('type', 'text');
});


$("body").on('click', '.password__icon.active', function () {
	$(this).removeClass("active");
	$(this).parent().find('.field').attr('type', 'password');
});

$('.contacts__form, .promotion__form').on("submit", function(event){
	event.preventDefault();
	var form = $(this);
	var errors = false;
	if ($('.contacts__form .form__checkbox input:checked').length > 0){
		$('.form__box').removeClass("error");
	} else {
		$('.form__box').addClass("error");
		errors = true;
	}
	form.find('.validate--js').each(function(){
		var val = $(this).val();
		if(val==''){
			$(this).removeClass('success');
			$(this).parent().removeClass('success');
			$(this).addClass('error');
			$(this).parent().addClass('error');
			errors = true;
		} else {
			$(this).removeClass('error');
			$(this).parent().removeClass('error');
			$(this).addClass('success');
			$(this).parent().addClass('success');
		}
		if($(this).hasClass('validate-email--js')){
			if(!validateEmail(val)){
				$(this).removeClass('success');
				$(this).parent().removeClass('success');
				$(this).addClass('error');
				$(this).parent().addClass('error');
			} else {
				$(this).removeClass('error');
				$(this).parent().removeClass('error');
				$(this).addClass('success');
				$(this).parent().addClass('success');
			}
		}
	});
});


function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

$('.validate--js').on('keyup', function(){
	var val = $(this).val();
	if(val==''){
		$(this).removeClass('success');
		$(this).parent().removeClass('success');
		$(this).addClass('error');
		$(this).parent().addClass('error');
		errors = true;
	} else {
		$(this).removeClass('error');
		$(this).parent().removeClass('error');
		$(this).addClass('success');
		$(this).parent().addClass('success');
	}

	if($(this).hasClass('validate-email--js')){
		if(!validateEmail(val)){
			$(this).removeClass('success');
			$(this).parent().removeClass('success');
			$(this).addClass('error');
			$(this).parent().addClass('error');
		} else {
			$(this).removeClass('error');
			$(this).parent().removeClass('error');
			$(this).addClass('success');
			$(this).parent().addClass('success');
		}
	}
});

$( document ).ready(function() {
	setTimeout(function(){
		$('.page_hide').removeClass('page_hide');
	}, 100);
})

/*Focus*/
if ($(".header__search-field").length > 0) {
	$('.header__search-field').on('focus', function () {
		$(this).parent().addClass("active");
	});
	$('.header__search-field').on('blur', function () {
		let email = $(this).val();
		if (email.length == 0) {
			$(this).parent().removeClass("active");
		} else {
			$(this).parent().addClass("active");
		}
	});
	$('.header__search-field').on('keyup', function () {
		var val = $(this).val();
		if(val!=''){
			$('.header__search-list').addClass("visible");
			$('.header__search-box').addClass("border");
		} else {
			$('.header__search-list').removeClass("visible");
			$('.header__search-box').removeClass("border");
		}

	});
	$('.header__search-list ul li a').on('click', function () {
		var val = $(this).find('span').text();
		$('.header__search-list').removeClass("visible");
		$('.header__search-field').val(val);
		$('.header__search-box').removeClass("border");

	});
	$(function ($) {
		$(document).mouseup(function (e) {
			var div = $(".header__search");
			if (!div.is(e.target) && div.has(e.target).length === 0) {
				$('.header__search-list').removeClass("visible");
				$('.header__search-box').removeClass("border");
			}
		});
	});
}

// Main menu open
if ($(".header__burger").length > 0) {
	$(".header__burger").on("click", function(){
		$("body").addClass("lock");
		$(".header__contain").addClass("active");
	});
	$(".header__closed").on("click", function(){
		$("body").removeClass("lock");
		$(".header__contain").removeClass("active");
	});
}

if ($(".header__btn").length > 0) {
	var min_width = 1010;
	$(window).on('resize', function () {
		var new_width = $(window).width();
		var container = $('.header');
		if (new_width <= min_width) {
			$('.header__btn').insertBefore($('.social_hidden'));
			$('.header__promotion').insertBefore($('.header__btn'));
			$('.header__cabinet').insertBefore($('.header__burger'));
		}
		if (new_width > min_width) {
			$('.header__btn').insertAfter($('.header__buttons'));
			$('.header__promotion').insertAfter($('.header__buttons-hidden'));
			$('.header__cabinet').insertAfter($('.header__promotion'));
		}
	}).trigger('resize');
}

$(".arrow-top").on("click", function () {
	var elementClick = $(this).attr("href")
	var destination = $(elementClick).offset().top;
	jQuery("html:not(:animated),body:not(:animated)").animate({scrollTop: destination}, 600);
	return false;
});


$(document).ready(function () {
  if ($(".header__profile-box").length > 0){

    $('.header__profile-link').on("click", function(){
      $('.header__profile-block').slideUp();
      $(".header__profile").removeClass("active");
    });
    $(function ($) {
      $(document).mouseup(function (e) {
        var div = $(".header__profile.active");
        if (!div.is(e.target) && div.has(e.target).length === 0) {
          div.removeClass("active");
          $('.header__profile-block').slideUp();
        }
      });
    });
  }
});


// inView('.bottom').on('enter', function (event, isInView) {
// 	$(event).addClass('bottom_visible');
// });

/* UP button */
$('.arrow-top').hide();

$( document ).ready(function() {

		function getScrollBarWidth() {
			var $outer = $('<div>').css({visibility: 'hidden', width: 100, overflow: 'scroll'}).appendTo('body'),
				widthWithScroll = $('<div>').css({width: '100%'}).appendTo($outer).outerWidth();
			$outer.remove();
			return 100 - widthWithScroll;
		};

		setTimeout(function(){
			$(document).on('scroll', function (){
					var pageHeight = $('.page').outerHeight(true);
					var footerHeight = $('.footer').outerHeight(true);
					var footerElement = pageHeight - footerHeight;
					var scrollArrow = $(document).scrollTop();
					var windowHeight = window.innerHeight;
					var right = getScrollBarWidth();
					if(scrollArrow > 100){
						$('.arrow-top').fadeIn();
					} else {
						$('.arrow-top').fadeOut();
					}
					if(scrollArrow  > (footerElement - windowHeight)) {
						$('.arrow-top').css({
							'position': 'absolute',
							'bottom': 'calc(20px + ' + footerHeight + 'px)',
							'right': 'calc(10px + ' + right + 'px)',
						});
					} else {
						$('.arrow-top').css({
							'position': 'fixed',
							'bottom': '20px',
							'right': '10px',
						});
					}

			});
		}, 300);
});

$(document).ready(function () {
  $('.callback--js').on('click', function (event) {
    event.preventDefault();
    $.fancybox.open({
      loop: false,
      src: '#callback-modal',
      baseClass: 'dark-fancybox',
      touch: false,
    });
  });

  $('.project--js').on('click', function (event) {
    event.preventDefault();
    $.fancybox.open({
      loop: false,
      src: '#project-modal',
      baseClass: 'dark-fancybox',
      touch: false,
    });
    $(".project__slick").slick('setPosition');

    $('.fancybox-slide').on('scroll',  function (){
      setTimeout(function(){
        if ($('.project-modal').length > 0) {
          var scroll = $('.fancybox-slide').scrollTop();

          if(scroll  > 50  ) {
            $('.project-modal .modal__closed').addClass('fixed')
          } else {
            $('.project-modal .modal__closed').removeClass('fixed')
          }
        }
      }, 100);

    });
  });

  $('.delete--js').on('click', function (event) {
    event.preventDefault();
    $.fancybox.open({
      loop: false,
      src: '#delete-modal',
      baseClass: 'dark-fancybox',
      touch: false,
    });
  });


  $('.forgot--js').on('click', function (event) {
    event.preventDefault();
    $.fancybox.open({
      closeExisting: true,
      loop: false,
      src: '#forgot-modal',
      baseClass: 'dark-fancybox',
      touch: false,
    });
  });

  $(".project__slide-box").fancybox({
    loop : true,
    backFocus: false,
    infobar: false,
    buttons : [
      'close'
    ],
    touch: false,
    baseClass: 'project-fancybox',
    btnTpl: {
      close:
        '<button data-fancybox-close class="fancybox-button fancybox-button--close" title="{{CLOSE}}">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.7348 9.0794C16.8396 8.98169 16.9241 8.86431 16.9835 8.73394C17.043 8.60357 17.0761 8.46277 17.0811 8.31958C17.0862 8.17639 17.0629 8.03362 17.0127 7.89941C16.9626 7.76521 16.8865 7.64219 16.7888 7.5374C16.6911 7.4326 16.5737 7.34808 16.4433 7.28865C16.3129 7.22922 16.1721 7.19605 16.029 7.19104C15.8858 7.18603 15.743 7.20926 15.6088 7.25943C15.4746 7.30959 15.3516 7.3857 15.2468 7.4834L12.0548 10.4594L9.07877 7.26631C8.87965 7.06236 8.6086 6.94444 8.32364 6.9378C8.03868 6.93115 7.76244 7.0363 7.55402 7.23075C7.3456 7.4252 7.22156 7.69349 7.20845 7.97823C7.19534 8.26297 7.2942 8.54153 7.48387 8.75431L10.4599 11.9463L7.26677 14.9223C7.15828 15.019 7.0702 15.1364 7.00772 15.2677C6.94523 15.3989 6.9096 15.5413 6.90292 15.6865C6.89623 15.8317 6.91863 15.9767 6.96879 16.1131C7.01895 16.2496 7.09586 16.3746 7.19501 16.4808C7.29416 16.5871 7.41355 16.6725 7.54616 16.732C7.67877 16.7915 7.82194 16.8239 7.96724 16.8273C8.11254 16.8307 8.25706 16.805 8.3923 16.7517C8.52754 16.6985 8.65078 16.6188 8.75477 16.5172L11.9468 13.5423L14.9228 16.7343C15.0189 16.8448 15.1362 16.9348 15.2678 16.999C15.3995 17.0632 15.5427 17.1002 15.6889 17.1079C15.8351 17.1155 15.9814 17.0937 16.119 17.0436C16.2566 16.9935 16.3828 16.9162 16.4899 16.8164C16.597 16.7165 16.6829 16.5961 16.7425 16.4624C16.8021 16.3286 16.8341 16.1842 16.8367 16.0378C16.8393 15.8914 16.8124 15.7459 16.7576 15.6102C16.7028 15.4744 16.6212 15.351 16.5177 15.2474L13.5428 12.0554L16.7348 9.0794Z" fill="#8EA5B2"/><path fill-rule="evenodd" clip-rule="evenodd" d="M0 12C0 5.37273 5.37273 0 12 0C18.6273 0 24 5.37273 24 12C24 18.6273 18.6273 24 12 24C5.37273 24 0 18.6273 0 12ZM12 21.8182C10.7107 21.8182 9.43394 21.5642 8.24274 21.0708C7.05155 20.5774 5.9692 19.8542 5.0575 18.9425C4.14579 18.0308 3.42259 16.9485 2.92918 15.7573C2.43577 14.5661 2.18182 13.2893 2.18182 12C2.18182 10.7107 2.43577 9.43394 2.92918 8.24274C3.42259 7.05155 4.14579 5.9692 5.0575 5.0575C5.9692 4.14579 7.05155 3.42259 8.24274 2.92918C9.43394 2.43577 10.7107 2.18182 12 2.18182C14.6039 2.18182 17.1012 3.21623 18.9425 5.0575C20.7838 6.89876 21.8182 9.39606 21.8182 12C21.8182 14.6039 20.7838 17.1012 18.9425 18.9425C17.1012 20.7838 14.6039 21.8182 12 21.8182Z" fill="#8EA5B2"/></svg>' +
        "</button>",

      // Arrows
      arrowLeft:
        '<button data-fancybox-prev class="fancybox-button fancybox-button--arrow_left" title="{{PREV}}">' +
        '<div><svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd"d="M16.875 10.0002C16.875 9.57833 16.533 9.23633 16.1111 9.23633H3.88889C3.467 9.23633 3.125 9.57833 3.125 10.0002C3.125 10.4221 3.467 10.7641 3.88889 10.7641H16.1111C16.533 10.7641 16.875 10.4221 16.875 10.0002Z"fill="#3340B4" /><path fill-rule="evenodd" clip-rule="evenodd"d="M9.77626 4.11241C9.47794 3.81409 8.99428 3.81409 8.69596 4.11241L3.34874 9.45963C3.05042 9.75795 3.05042 10.2416 3.34874 10.5399L8.69596 15.8872C8.99428 16.1855 9.47794 16.1855 9.77626 15.8872C10.0746 15.5888 10.0746 15.1052 9.77626 14.8069L4.96919 9.99978L9.77626 5.19271C10.0746 4.89439 10.0746 4.41073 9.77626 4.11241Z"fill="#3340B4" /></svg></div>' +
        "</button>",

      arrowRight:
        '<button data-fancybox-next class="fancybox-button fancybox-button--arrow_right" title="{{NEXT}}">' +
        '<div><svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd"d="M3.12524 9.99881C3.12524 10.4207 3.46725 10.7627 3.88913 10.7627L16.1114 10.7627C16.5332 10.7627 16.8752 10.4207 16.8752 9.99881C16.8752 9.57693 16.5332 9.23492 16.1114 9.23492L3.88913 9.23492C3.46725 9.23492 3.12524 9.57692 3.12524 9.99881Z"fill="#3340B4" /><path fill-rule="evenodd" clip-rule="evenodd"d="M10.224 15.8866C10.5223 16.1849 11.006 16.1849 11.3043 15.8866L16.6515 10.5394C16.9498 10.2411 16.9498 9.75741 16.6515 9.45909L11.3043 4.11187C11.006 3.81355 10.5223 3.81355 10.224 4.11187C9.92567 4.41018 9.92567 4.89385 10.224 5.19217L15.0311 9.99924L10.224 14.8063C9.92566 15.1046 9.92566 15.5883 10.224 15.8866Z"fill="#3340B4" /></svg></div>' +
        "</button>",
    }
  });

})


$('[data-personal-area]').on('click', function (e) {
	e.preventDefault();
	$('.personal-area__tab').removeClass('active');
	$('.personal-area__block').removeClass('active');
	$(this).addClass('active');
	var personalArea = $(this).data('personal-area');
	$('[data-personal-area-block="' + personalArea + '"]').toggleClass('active');
});

$(document).ready(function () {

  if ($('#price').length > 0) {
    var nonLinearStepSlider = document.getElementById('price');
    noUiSlider.create(nonLinearStepSlider, {
      start: [0, 654],
      connect: true,
      behaviour: 'drag',
      tooltips: [true, true],
      range: {
        'min': [0],
        'max': [999]
      },
      format: wNumb({
        decimals: 0,
        thousand: ' ',
        suffix: '',
        to: function (value) {
          return Math.round(value) + '';
        },
        from: function (value) {
          return Math.round(value) + '';
        }
      })
    });

    nonLinearStepSlider.noUiSlider.on('update', function (values, handle) {
      var minValue = values[0];
      var maxValue = values[1];
      var parcentMin = (100 / 1000) * minValue;
      var parcentMax = (100 / 1000) * maxValue;
      $('#price .noUi-bg-line').css('width', parcentMin+'%');
      $('#price .c-1-color').css('width', parcentMax+'%');
      $('[name="price"]').val(maxValue);
    });

    $("#price").find('.noUi-connects').append('<div class="noUi-bg"><span></span></div><div class="noUi-bg-line"><span></span></div>');
    var connect = nonLinearStepSlider.querySelectorAll('.noUi-bg');
    var classes = ['c-1-color'];
    for (var i = 0; i < connect.length; i++) {
      connect[i].classList.add(classes[i]);
    }
  }
});

$('.project__slick').slick({
	slidesToShow: 3,
	slidesToScroll: 1,
	arrows: false,
	dots: false,
	infinite: true,
	speed: 500,
	swipeToSlide: true,
	responsive: [
		{
			breakpoint: 500,
			settings: {
				slidesToShow: 2,
				slidesToScroll: 1,
			}
		}
	]
});

$('.project .arrow.arrow_prew').on("click", function (event) {
	$(this).parents('.project').find('.project__slick').slick('slickPrev');
});

$('.project .arrow.arrow_next').on("click", function (event) {
	$(this).parents('.project').find('.project__slick').slick('slickNext');
});

$('.promo__slick').slick({
	slidesToShow: 1,
	slidesToScroll: 1,
	arrows: false,
	dots: true,
	infinite: true,
	speed: 500,
	fade: true,
});

$('.promo .arrow.arrow_prew').on("click", function (event) {
	$(this).parents('.promo').find('.promo__slick').slick('slickPrev');
});

$('.promo .arrow.arrow_next').on("click", function (event) {
	$(this).parents('.promo').find('.promo__slick').slick('slickNext');
});

// Custom Select
$('.select').on("click", function(event) {
	if(!$(this).hasClass('disabled')){
		$('.select').not(this).removeClass('active').find('.select-options').slideUp(50);
		$(this).toggleClass('active');
		$(this).find('.select-options').slideToggle(50);
	}
});

$('.select-options__value').on("click", function() {
	$(this).parents('.select').find('.select-title__value').html($(this).html());
	if($.trim($(this).data('value'))!=''){
		$(this).parents('.select').find('input').val($(this).data('value'));
		$(this).parents('.select').addClass('select_active');
	}else{
		$(this).parents('.select').find('input').val($(this).text());
		$(this).parents('.select').addClass('select_active');
		$('.filter-sort--js.active').removeClass('active desc asc');
		$('.sort_by--js').val('desc');
		$('.sort_order--js').val($(this).text());
	}
});

$(document).on("click", function(e) {
	if (!$(e.target).is(".select *")) {
		$('.select').removeClass('active');
		$('.select-options').slideUp(50);
	};
});

$('.select-social').on("click", function(event) {
	if(!$(this).hasClass('disabled')){
		$('.select-social').not(this).removeClass('active').find('.select-social__options').slideUp(50);
		$(this).find(".select-social__title").toggleClass('active');
		$(this).find('.select-social__options').slideToggle(50);
	}
});

$(document).on("click", function(e) {
	if (!$(e.target).is(".select-social *")) {
		$('.select-social').find(".select-social__title").removeClass('active');
		$('.select-social__options').slideUp(50);
	};
});

$(document).on("click", function(e) {
	if (!$(e.target).is(".times__left *,.times__right * ")) {
		$('.times__select--js.active').removeClass('active');
	};
});

$('body').on("click", '.times__select--js .times__select-option:not(.timezone)', function() {
	var value = $(this).text();
	var parent = $(this).parents('.times__left');
	var inputID = parent.parents('.times').attr('data-id');
	var timeZone = parent.parents('.times').find('.select-timezone-open--js').text();
	var input = $('[data-calendar-id="'+inputID+'"]');
	var inputVal = input.val();
	if (inputVal!='') {
		inputVal = inputVal.slice(0,10);
	}
	parent.find('.times__left-text--js').text(value );
	parent.addClass('active');
	parent.removeClass('error');
	$(this).parent().removeClass('active');
	if(!parent.hasClass('times__right')){
		if(inputVal.length < 10){
			input.val(value + ', '+timeZone);
		} else {
			input.val(inputVal + ', '+value + ', '+timeZone);
		}

	}
});
$('body').on("click", '.times__select--js .times__select-option.timezone', function() {
	var timeZone = $(this).text();
	var parent = $(this).parents('.times__left');
	var inputID = parent.parents('.times').attr('data-id');
	var time = parent.parents('.times').find('.select-open--js').text();
	var input = $('[data-calendar-id="'+inputID+'"]');
	var inputVal = input.val();
	if (inputVal!='') {
		inputVal = inputVal.slice(0,10);
	}
	parent.find('.times__left-text--js').text(timeZone );
	parent.addClass('active');
	parent.removeClass('error');
	$(this).parent().removeClass('active');
	if(parent.hasClass('times__right')){
		if(time != 'time'){
			input.val(inputVal + ', '+time + ', '+timeZone);
		} else {
			if(inputVal.length < 10){
				input.val(timeZone);
			} else {
				input.val(inputVal+ ', '+timeZone);
			}
		}

	}
});
$('body').on("click", '.select-open--js', function() {
	$(this).next('.times__select--js').addClass('active');
});
$('body').on("click", '.select-timezone-open--js', function() {
	$(this).next('.times__select--js').addClass('active');
});
$('body').on("click", '.select-clear--js', function() {
	var parent = $(this).parents('.times__left');
	var inputID = parent.parents('.times').attr('data-id');
	var input = $('[data-calendar-id="'+inputID+'"]');
	var inputVal = input.val();
	if (inputVal.length>10) {
		inputVal = inputVal.slice(0,10);
	} else {
		inputVal = '';
	}
	input.val(inputVal);
	parent.find('.times__left-text--js').text('time');
	parent.removeClass('active');
	$(this).next('.times__select--js').removeClass('active');
});


$(".select-social__closed").on("click", function () {
	$(this).parent().slideUp(500);
});

if ($("#days").length > 0) {
	function countdown(dateEnd) {
		var timer, days, hours, minutes, seconds;
		dateEnd = new Date(dateEnd);
		dateEnd = dateEnd.getTime();
		if (isNaN(dateEnd)) {
			return;
		}
		timer = setInterval(calculate, 1000);
		function calculate() {
			var dateStart = new Date();
			var dateStart = new Date(dateStart.getUTCFullYear(),
				dateStart.getUTCMonth(),
				dateStart.getUTCDate(),
				dateStart.getUTCHours(),
				dateStart.getUTCMinutes(),
				dateStart.getUTCSeconds());
			var timeRemaining = parseInt((dateEnd - dateStart.getTime()) / 1000)

		if (timeRemaining >= 0) {
			days = parseInt(timeRemaining / 86400);
			timeRemaining = (timeRemaining % 86400);
			hours = parseInt(timeRemaining / 3600);
			timeRemaining = (timeRemaining % 3600);
			minutes = parseInt(timeRemaining / 60);
			timeRemaining = (timeRemaining % 60);
			seconds = parseInt(timeRemaining);

			document.getElementById("days").innerHTML = parseInt(days, 10);
			document.getElementById("hours").innerHTML = ("0" + hours).slice(-2);
			document.getElementById("minutes").innerHTML = ("0" + minutes).slice(-2);
			document.getElementById("seconds").innerHTML = ("0" + seconds).slice(-2);
			} else {
				return;
			}
		}

		function display(days, hours, minutes, seconds) {}
	}

	countdown ('06/20/2021 00:00:00 AM');
}

$(".unsubscribed__icon").on("click", function (event) {
	$(this).parent().slideUp(500);
});

$("body").on("click",".select-social__closed", function (event) {
	var el = $(this).parent();
	el.slideUp(500);
	setTimeout(function(){
		el.remove();
	}, 500);
});
