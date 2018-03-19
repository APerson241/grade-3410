// Globals
var props = {
    projectNum: 0
};

// Index into each property with (projectNum - 1)
var config = {
    maxStyleDeduct: [ 5, 10 ],
    asteriskLines: [ 2, 1 ],
    tooManyAsteriskLines: [ 3, 1 ],
    sectionNameMapping: [
        { "CIRCUIT": "Circuit", "DOCUMENTATION": "Documentation", "TEST VECTORS": "Testing" },
        { "Circuit": "Circuit", "Documentation": "Documentation", "Testing": "Testing", "Fibonacci": "Fibonacci" }
    ]
};

document.addEventListener( "DOMContentLoaded", function() {
    var rubricAreaEl = document.getElementById( "rubric-area" );
    var updateRubricButton = document.getElementById( "update-rubric-button" );
    updateRubricButton.addEventListener( "click", function () {
        var rubricEl = document.getElementById( "rubric" );
        var lines = rubricAreaEl.value.split( "\n" );

        // PROJECT 1/2 ID
        props.projectNum = lines[0].includes( "P2" ) ? 2 : 1;

        var newHtml = "";
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
        var multiDeduction;
        switch( props.projectNum ) {
        case 1:
            multiDeduction = {
                "tion (up to -8)": 8,
                "lication (-20 max": 20,
                "de, e.g. failing both": 26,
                "Control logic": 3,
                "Subcircuit descriptions are": 3,
                "Didn't explain how": 20
            };
            break;
        case 2:
            multiDeduction = {
                "failing basic d": 30,
                "failing hazard handling": 30,
            };
            break;
        }
        var currMultiDeduction = 0; // nonzero if the current line is a multideduction

        // Asterisk lines are used to delimit sections.
        var neededAsteriskLines = config.asteriskLines[ props.projectNum - 1 ];
        var tooManyAsteriskLines = config.tooManyAsteriskLines[ props.projectNum - 1 ];

        var sectionNameMapping = config.sectionNameMapping[ props.projectNum - 1 ];
        for( var i = 0; i < lines.length; i++ ) {
            currLine = lines[i];
            hidingLine = false;
            lineIsDeduction = false;
            currMultiDeduction = 0;

            if( currLine.startsWith( "***********" ) ) asteriskLineCount++;
            if( ( asteriskLineCount < neededAsteriskLines ) || ( asteriskLineCount > tooManyAsteriskLines ) ) continue;

            // Section header documentation
            markdownSectionMatch = markdownSectionRegex.exec( currLine );
            if( markdownSectionMatch ) {
                var level = markdownSectionMatch[1].length;
                newHtml += "<h" + level + ">" + markdownSectionMatch[2] + "</h"
                    + level + ">";
                hidingLine = true;

                // Also detect if this is a high-level section header
                for( var sectionName in sectionNameMapping ) {
                    if( currLine.includes( sectionName ) ) {
                        currSection = sectionNameMapping[ sectionName ];
                        break;
                    }
                }

                // Also detect if we're in the style section
                if( currLine.includes( "Style" ) && ( level === 3 ) ) {
                    inStyleSection = true;
                } else if( inStyleSection ) {

                    // We have encountered another section header, turn style off
                    inStyleSection = false;
                }
            }

            var isHere = function ( someText ) { return currLine.indexOf( someText ) >= 0; };
            //if( isHere( "CMS" ) ) continue;
            //if( isHere( "Pong" ) ) break;
            for( var keyPhrase in multiDeduction ) {
                if( isHere( keyPhrase ) ) {
                    currMultiDeduction = multiDeduction[keyPhrase];
                    break;
                }
            }

            deductionMatch = /(?:\*\s*.+\| .*?\s*(-?\s*\d+).*|\[-\/\d+\])/.exec( currLine );
            //if( ( /\s*\[/.test( currLine ) || lines[i-1].endsWith( " or" ) ) && !isHere( "STOP" ) && !isHere( "ineff" ) ) {
            if( deductionMatch ) {
                var slashIndex = currLine.indexOf( "[-/" );
                console.log(slashIndex, currLine);
                var id;
                var maxPosMatch;
                var maxPos; // maximum score for this item, in positive grading
                if( currMultiDeduction > 0 ) {

                    // MULTIDEDUCT
                    id = "field-" + i;
                    newHtml += "−<input type='text' class='digit' value='0' id='" + id + "' />";
                    //var maxVal = parseInt( currLine.substring( slashIndex + 3, currLine.indexOf( "]" ) ) );
                    newHtml += "/" + currMultiDeduction;
                    window.inputMapping[id] = { line: currLine, section: currSection, max: currMultiDeduction };
                } else if( slashIndex >= 0 ) {

                    // POSITIVE GRADING
                    maxPosMatch = /\[-\/(\d+)\]/.exec( currLine );
                    maxPos = maxPosMatch[1];
                    id = "field-pos-" + i;
                    newHtml += "+<input type='text' class='digit' value='" + maxPos + "' id='" + id + "' />";
                    newHtml += "/" + maxPos;
                    window.inputMapping[id] = { line: currLine, section: currSection, max: maxPos };
                    currLine = currLine.replace( maxPosMatch[0], "" );
                } else {

                    // CHECKBOX RUBRIC ITEMS HERE
                    id = "checkbox-" + i;
                    var value = deductionMatch[1].replace( /\s/g, "" ).replace( "??", "" );
                    newHtml += "<input type='checkbox' id='" + id + "' value='" + value + "'" +
                        " data-stylesection='" + inStyleSection + "'/>";
                    window.inputMapping[id] = { line: currLine, section: currSection };
                }
                newHtml += "<label for='" + id + "'>" + currLine.replace( /^\s*\*/, "") + "</label><br />";
                hidingLine = true;
            }

            // Force linebreaks in especially beefy lines
            //currLine = currLine
            //    .replace( "Conventions", "Conventions<br />" )
            //    .replace( "in MEM stage", "in MEM stage<br />" );
            if( !hidingLine && !!currLine ) {

                // Handle "NOTE"'s
                if( currLine.startsWith( "NOTE" ) ) currLine = "<em class='space-above'>" + currLine + "</em>";
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
        var sectionText, sectionScore, sectionMaxScore;
        switch( props.projectNum ) {
        case 1:
            var sectionText = { "Circuit": "", "Documentation": "", "Testing": ""};
            var sectionScore = { "Circuit": 70, "Documentation": 10, "Testing": 20};
            var sectionMaxScore = { "Circuit": 70, "Documentation": 10, "Testing": 20};
            break;
        case 2:
            var sectionText = { "Circuit": "", "Documentation": "", "Testing": "", "Fibonacci": "" };
            var sectionScore = { "Circuit": 75, "Documentation": 10, "Testing": 15, "Fibonacci": 10 };
            var sectionMaxScore = { "Circuit": 75, "Documentation": 10, "Testing": 15, "Fibonacci": 10 };
            break;
        }

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

        var maxStyleDeduct = config.maxStyleDeduct[props.projectNum - 1];
        var styleOverflow = styleSubscore < -maxStyleDeduct;
        if( styleOverflow ) styleSubscore = -maxStyleDeduct;

        sectionScore[ "Circuit" ] += styleSubscore;

        var fields = document.querySelectorAll( "input[type=text]" );
        for( var i = 0; i < fields.length; i++ ) {
            currMetadata = inputMapping[ fields[i].id ];
            if( fields[i].value.length && parseInt( fields[i].value ) < currMetadata.max && fields[i].value !== "0" ) {
                if( fields[i].id.includes( "-pos-" ) ) {
                    sectionText[ currMetadata.section ] += "<br />" + currMetadata.line.trim().replace( "[-/", "[" + parseInt( fields[i].value ) + "/" ) + " -> ";
                    pointsDeducted = currMetadata.max - parseInt( fields[i].value );
                } else {
                    sectionText[ currMetadata.section ] += "<br />" + currMetadata.line.trim() + " -> ";
                    pointsDeducted = parseInt( fields[i].value );
                }
                sectionText[ currMetadata.section ] += pointsDeducted + " deducted";
                sectionScore[ currMetadata.section] -= pointsDeducted;
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
                comment += "<br />(Although more than " + maxStyleDeduct + " style point deductions applied, only " + maxStyleDeduct + " points were deducted.)";
            }
            comment += sectionText[currSec];
        }
        return comment;
    }
} );
