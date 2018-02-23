document.addEventListener( "DOMContentLoaded", function() {
    var rubricAreaEl = document.getElementById( "rubric-area" );
    var updateRubricButton = document.getElementById( "update-rubric-button" );
    updateRubricButton.addEventListener( "click", function () {
        var rubricEl = document.getElementById( "rubric" );
        var newHtml = "";
        var lines = rubricAreaEl.value.split( "\n" );
        var asteriskLineCount = 0;
        var currLine;
        window.inputMapping = {};
        var currSection = "";
        var sectionRegex = /(?:\(\d+\spoints\)\s*(\w+)|(\w+)\s*\(out of \d+\))/;
        var markdownSectionRegex = /(#+)\s*(.+)/;
        var hidingLine = false; // whether to suppress this line's raw display
        var lineIsDeduction = false;
        var inStyleSection = false; // are we in the "style" section

        // Multi-deduction questions
        multiDeduction = {
            "tion (up to -8)": 8,
            "lication (-20 max": 20,
            "de, e.g. failing both": 26,
            "Control logic": 3,
            "Subcircuit descriptions are": 3,
            "Didn't explain how": 20
        };
        var currMultiDeduction = 0; // nonzero if the current line is a multideduction

        for( var i = 0; i < lines.length; i++ ) {
            currLine = lines[i];
            hidingLine = false;
            lineIsDeduction = false;
            currMultiDeduction = 0;

            if( asteriskLineCount < 2 ) {
                if( currLine.startsWith( "***********" ) ) asteriskLineCount++;
                continue;
            }

            // Section header documentation
            markdownSectionMatch = markdownSectionRegex.exec( currLine );
            if( markdownSectionMatch ) {
                var level = markdownSectionMatch[1].length;
                newHtml += "<h" + level + ">" + markdownSectionMatch[2] + "</h"
                    + level + ">";
                hidingLine = true;

                // Also detect if this is a high-level section header
                if( currLine.includes( "CIRCUIT" ) ) {
                    currSection = "Circuit";
                } else if( currLine.includes( "DOCUMENTATION" ) ) {
                    currSection = "Documentation";
                } else if( currLine.includes( "TEST VECTORS" ) ) {
                    currSection = "Testing";
                }

                // Also detect if we're in the style section
                if( currLine.includes( "Style" ) && ( level === 3 ) ) {
                    inStyleSection = true;
                } else if( inStyleSection && ( level === 3 ) ) {
                    inStyleSection = false;
                }
            }

            var isHere = function ( someText ) { return currLine.indexOf( someText ) >= 0; };
            if( isHere( "CMS" ) ) continue;
            if( isHere( "Pong" ) ) break;
            for( var keyPhrase in multiDeduction ) {
                if( isHere( keyPhrase ) ) {
                    currMultiDeduction = multiDeduction[keyPhrase];
                    break;
                }
            }

            deductionMatch = /\*\s*.+\| .*?\s*(-?\s*\d+).*/.exec( currLine );
            //if( ( /\s*\[/.test( currLine ) || lines[i-1].endsWith( " or" ) ) && !isHere( "STOP" ) && !isHere( "ineff" ) ) {
            if( deductionMatch ) {
                var slashIndex = currLine.indexOf( "[-/" );
                var id;
                if( currMultiDeduction > 0 ) {
                    id = "field-" + i;
                    newHtml += "-<input type='text' class='digit' value='0' id='" + id + "' />";
                    //var maxVal = parseInt( currLine.substring( slashIndex + 3, currLine.indexOf( "]" ) ) );
                    newHtml += "/" + currMultiDeduction;
                    window.inputMapping[id] = { line: currLine, section: currSection, max: currMultiDeduction };
                } else {

                    // CHECKBOX RUBRIC ITEMS HERE
                    id = "checkbox-" + i;
                    var value = deductionMatch[1].replace( /\s/g, "" ).replace( "??", "" );
                    newHtml += "<input type='checkbox' id='" + id + "' value='" + value + "'" +
                        " data-stylesection='" + inStyleSection + "'/>";
                    window.inputMapping[id] = { line: currLine, section: currSection };
                }
                newHtml += "<label for='" + id + "'>" + currLine.replace( /^\*/, "") + "</label><br />";
                hidingLine = true;
            }

            // Force linebreaks in especially beefy lines
            //currLine = currLine
            //    .replace( "Conventions", "Conventions<br />" )
            //    .replace( "in MEM stage", "in MEM stage<br />" );
            if( !hidingLine ) {
                newHtml += "<span class='line'>" + currLine + "</span><br />";
            }
        }
        rubricEl.innerHTML = newHtml;
    } );

    var updateCommentButtons = document.getElementsByClassName( "update-comment-button" );
    for( var i = 0; i < updateCommentButtons.length; i++ ) {
        updateCommentButtons[i].addEventListener( "click", function () {
            document.getElementById( "comment" ).innerHTML = getCMSComment( window.inputMapping );
        } );
    }

    function getCMSComment( inputMapping ) {

        // Iniitialize section text
        //var sectionText = { "Circuit": "", "Documentation": "", "Testing": "", "Fibonacci": "" };
        //var sectionScore = { "Circuit": 75, "Documentation": 8, "Testing": 15, "Fibonacci": 18 };
        //var sectionMaxScore = { "Circuit": 75, "Documentation": 8, "Testing": 15, "Fibonacci": 18 };
        var sectionText = { "Circuit": "", "Documentation": "", "Testing": ""};
        var sectionScore = { "Circuit": 70, "Documentation": 10, "Testing": 20};
        var sectionMaxScore = { "Circuit": 70, "Documentation": 10, "Testing": 20};

        var currMetadata;

        var checkboxes = document.querySelectorAll( "input[type=checkbox]" );
        var styleSubscore = 0;
        for( var i = 0; i < checkboxes.length; i++ ) {
            if( checkboxes[i].checked ) {
                currMetadata = inputMapping[ checkboxes[i].id ];
                sectionText[ currMetadata.section ] += "<br />" + currMetadata.line.trim();
                if( checkboxes[i].dataset.stylesection === "false" ) {
                    sectionScore[ currMetadata.section ] += parseInt( checkboxes[i].value );
                } else {
                    styleSubscore += parseInt( checkboxes[i].value );
                }
                //sectionScore[ currMetadata.section ] -=
                //        parseInt( currMetadata.line.substring(
                //        currMetadata.line.indexOf( "-" ) + 1, currMetadata.line.indexOf( "]" ) ) );
            }
        }

        var styleOverflow = styleSubscore < -5;
        if( styleOverflow ) styleSubscore = -5;

        sectionScore[ "Circuit" ] += styleSubscore;

        var fields = document.querySelectorAll( "input[type=text]" );
        for( var i = 0; i < fields.length; i++ ) {
            currMetadata = inputMapping[ fields[i].id ];
            if( fields[i].value.length && parseInt( fields[i].value ) < currMetadata.max && fields[i].value !== "0" ) {
                sectionText[ currMetadata.section ] += "<br />" + currMetadata.line.trim() + " -> -" + fields[i].value + " total";
                sectionScore[ currMetadata.section] -= parseInt( fields[i].value );
            }
        }

        // Write out comment
        var comment = "";
        var sectionNames = Object.keys( sectionText );
        var currSec;
        for( var i = 0; i < sectionNames.length; i++ ) {
            currSec = sectionNames[i];
            comment += "<br /><br />&lt;b>" + currSec + ": " + sectionScore[currSec] + "/" + sectionMaxScore[currSec] + "&lt;/b>";
            if( i == 0 && styleOverflow ) {
                comment += "<br />(Although more than 5 style point deductions applied, only 5 points were deducted.)";
            }
            comment += sectionText[currSec];
        }
        return comment;
    }
} );
