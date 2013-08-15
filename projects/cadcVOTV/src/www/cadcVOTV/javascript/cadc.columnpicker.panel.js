(function ($)
{
  /**
   * New Panel column picker.
   *
   * @param columns   The columns to put.
   * @param grid      The underlying Grid.
   * @param panel     The panel to put the link in.
   * @param tooltipOptions    The options to be passed to the tooltip.
   * @param options   Optional items.
   * @constructor
   */
  function PanelTooltipColumnPicker(columns, grid, panel, tooltipOptions,
                                    options)
  {
    // Cached value to reset to.
    var originalColumns;

    var $link;
    var $menu;
    var thresholdListItemSelector =
        "li.slick-column-picker-tooltip-threshold";
    var self = this;

    if (!jQuery.fn.tooltip)
    {
      throw "CADC Panel Tooltip Column Picker requires a tooltip library "
          + "(jQuery.tools or jQuery.ui) module to be loaded";
    }

    var defaults =
    {
      fadeSpeed: 250,
      linkText: "More columns..."
    };

    var defaultTooltipOptions =
    {
      appendTooltipContent: false,
      targetSelector: ".tooltip_content"
    };

    function init()
    {
      options = $.extend({}, defaults, options);
      tooltipOptions = $.extend({}, defaultTooltipOptions, tooltipOptions);
      originalColumns = [];
      var gridColumns = grid.getColumns().slice(0);

      $.each(gridColumns, function(gridColumnIndex, gridColumn)
      {
        originalColumns.push(gridColumn);
      });

      // Clean up first.
      panel.find("a.slick-columnpicker-panel-link-label").remove();

      var $linkHolder = $("<span class='slick-columnpicker-panel-link-holder'></span>").appendTo(panel);

      $link = $("<a name='slick-columnpicker-panel-link' class='slick-columnpicker-panel-link-label'></a>").appendTo($linkHolder);
      $link.text(options.linkText);
      $link.mouseover(function (e)
                      {
                        buildTooltipPicker(e);
                      });

      // Used to support the outdated jQuery.tools tooltip.
      if (tooltipOptions.appendTooltipContent)
      {
        $(tooltipOptions.tooltipContent).remove();
        $link.after(tooltipOptions.tooltipContent);
      }

      // Assume default tooltip attachment.
      if (!tooltipOptions.tooltipInit)
      {
        $link.tooltip(tooltipOptions);
      }
      else
      {
        tooltipOptions.tooltipInit($link);
      }

      // Clean up existing button holder.
      $(tooltipOptions.targetSelector).empty();

      var $buttonHolder = $("<div class='slick-column-picker-tooltip-button-holder'></div>").appendTo(tooltipOptions.targetSelector);

      var $showAllSpan = $("<span class='slick-column-picker-button'>Show all columns</span>").appendTo($buttonHolder);
      var $resetSpan = $("<span class='slick-column-picker-button'>Reset column order</span>").appendTo($buttonHolder);
      var $orderAlphaSpan = $("<span class='slick-column-picker-button'>Order alphabetically</span>").appendTo($buttonHolder);

      $resetSpan.click(function(e)
                       {
                         grid.setColumns(originalColumns.slice(0));
                         grid.invalidate();
                         grid.resizeCanvas();
                         buildTooltipPicker(e);
                         $menu.sortable("refresh");

                         trigger(self.onResetColumnOrder, null, null);
                       });

      $showAllSpan.click(function(e)
                         {
                           grid.setColumns(columns.slice(0));
                           grid.invalidate();
                           grid.resizeCanvas();
                           buildTooltipPicker(e);
                           $menu.sortable("refresh");

                           trigger(self.onShowAllColumns, null, null);
                         });

      $orderAlphaSpan.click(function(e)
                            {
                              var arr = grid.getColumns().slice(0);
                              arr.sort(function(o1, o2)
                                       {
                                         var lowerO1Name =
                                             o1.name.toLowerCase();
                                         var lowerO2Name =
                                             o2.name.toLowerCase();
                                         return lowerO1Name > lowerO2Name
                                                ? 1 : lowerO1Name < lowerO2Name
                                                      ? -1 : 0;
                                       });

                              grid.setColumns(arr);
                              grid.invalidate();
                              grid.resizeCanvas();
                              buildTooltipPicker(e);
                              $menu.sortable("refresh");

                              trigger(self.onSortAlphabetically, null, null);
                            });

      $menu = $("<ul class='slick-columnpicker slick-columnpicker-tooltip' />").appendTo(tooltipOptions.targetSelector);

      $menu.sortable({
                       opacity: 0.8,
                       containment: "parent",
                       tolerance: "pointer",
                       axis: "y",
                       stop: function (e, ui)
                       {
                         var $checkbox = ui.item.find(":checkbox");
                         var $liItems = $menu.find("li");
                         var thisItemIndex = $liItems.index(ui.item);
                         var thresholdIndex = $liItems.index($(thresholdListItemSelector));

                         if (thisItemIndex < thresholdIndex)
                         {
                           // This item is above the threshold line.
                           $checkbox.attr("checked", "checked");
                         }
                         else
                         {
                           // This item is below the threshold line.
                           $checkbox.removeAttr("checked");
                         }

                         updateColumns();
                         e.stopPropagation();
                       }
                     });

      $menu.disableSelection();
    }

    function buildTooltipPicker(e)
    {
      $menu.empty();
      var displayedColumns = grid.getColumns();

      addColumns(displayedColumns);

      $("<li class='slick-column-picker-tooltip-threshold'><hr class='slick-column-picker-tooltip-threshold-line' /></li>").appendTo($menu);

      // What's left after the displayed columns.
      var remainingCols = [];

      $.each(columns, function(index, col)
      {
        var isDisplayed = false;

        $.each(displayedColumns, function(dIndex, dCol)
        {
          if (dCol.id == col.id)
          {
            isDisplayed = true;
          }
        });

        if (!isDisplayed)
        {
          remainingCols.push(col);
        }
      });

      addColumns(remainingCols);

      $menu.parent().css("top", e.pageY).css("left", e.pageX);
    }

    function addColumns(cols)
    {
      $.each(cols, function(cindex, nextCol)
      {
        var $li = $("<li class=\"ui-state-default\"></li>").appendTo($menu);
        $li.attr("id", "ITEM_" + nextCol.id);
        $li.data("column-id", nextCol.id);

        // Omit the checkbox column.
        if (nextCol.id == "_checkbox_selector")
        {
          $li.hide();
        }

        var $input = $("<input type='checkbox' name='column-picker-"
                       + nextCol.id + "' />").data("column-id", nextCol.id);

        // Occurrs after the actual checkbox is checked.
        $input.change(function (e)
                     {
                       var $checkbox = $(this);
                       var $listItem = $checkbox.parent().parent();

                       if (!$checkbox.is(":checked"))
                       {
                         $(thresholdListItemSelector).after($listItem);
                         $listItem.find(":checkbox").removeAttr("checked");
                       }
                       else
                       {
                         $(thresholdListItemSelector).before($listItem);
                         $listItem.find(":checkbox").attr("checked", "checked");
                       }

                       // Refresh the list.
                       $menu.sortable("refresh");

                       updateColumns();
                     });

        if (grid.getColumnIndex(nextCol.id))
        {
          $input.attr("checked", "checked");
        }

        var $columnLabel =
            $("<div class='slick-column-picker-label-text'></div>").text(
                nextCol.name);
        $columnLabel.attr("id", "LABEL_" + nextCol.id);

        var $columnDescription =
            $("<div class='slick-column-picker-description-label-text'></div>").text(
                nextCol.description);

        if (nextCol.unit)
        {
          var $columnUnitDescriptionContainer = $("<span></span>");
          var $columnUnitDescription =
              $("<span class='slick-column-picker-unit-label-text'></span>");
          $columnUnitDescription.text(nextCol.unit);

          $columnUnitDescriptionContainer.append(" (Default unit '").append(
              $columnUnitDescription).append("')");
          $columnDescription.append($columnUnitDescriptionContainer);
          $columnDescription.attr("id", "_DESC_" + nextCol.id);
        }

        $columnLabel.prepend($input);

        $columnLabel.appendTo($li);
        $columnDescription.appendTo($li);
      });
    }

    /**
     * Fire an event.  Taken from the slick.grid Object.
     *
     * @param evt     The Event to fire.
     * @param args    Arguments to the event.
     * @param e       Event data.
     * @returns {*}   The event notification result.
     */
    function trigger(evt, args, e)
    {
      e = e || new Slick.EventData();
      args = args || {};
      args.grid = grid;
      return evt.notify(args, e, self);
    }

    function updateColumns()
    {
      var previousItems = $(thresholdListItemSelector).prevAll();
      var previousItemCount = previousItems.length;
      var visibleColumns = [];

      $.each(previousItems, function (i, li)
      {
        var $listItem = $(li);

        $listItem.find(":checkbox").attr("checked", "checked");
        var listItemColumnID = $listItem.data("column-id");

        $.each(columns, function(cI, cO)
        {
          if (cO.id == listItemColumnID)
          {
            visibleColumns[(previousItemCount - 1) - i] = cO;
          }
        });
      });

      if (visibleColumns.length)
      {
        grid.setColumns(visibleColumns);
      }

      var nextItems = $(thresholdListItemSelector).nextAll();
      $.each(nextItems, function (n, nli)
      {
        var $listItem = $(nli);
        $listItem.find(":checkbox").removeAttr("checked");
      });

      trigger(self.onSort,
              {
                "visibleColumns": visibleColumns
              }, null);

      trigger(self.onColumnAddOrRemove,
              {
                "visibleColumns": visibleColumns
              }, null);
    }

    $.extend(this,
             {
               "onColumnAddOrRemove": new Slick.Event(),
               "onSort": new Slick.Event(),
               "onResetColumnOrder": new Slick.Event(),
               "onShowAllColumns": new Slick.Event(),
               "onSortAlphabetically": new Slick.Event()
             });

    init();
  }

  // Slick.Controls.PanelTooltipColumnPicker
  $.extend(true, window,
           {
             Slick: {
               Controls: {
                 PanelTooltipColumnPicker: PanelTooltipColumnPicker
               }
             }
           });
})(jQuery);
