import React, { useState } from 'react';
import { PageHeader } from '../../components/ui';
import { Card } from '../../components/ui/card/Card';
import { MediaCard } from '../../components/ui/card/patterns/MediaCard';
import { ActionCard } from '../../components/ui/card/patterns/ActionCard';
import { Button } from '../../components/ui/button/Button';
import { IconButton } from '../../components/ui/button/IconButton';

/**
 * CardPrimitivesTestPage - Comprehensive test page for Card System
 *
 * Demonstrates:
 * - All 5 card primitives independently
 * - Compound component usage pattern
 * - All CardContainer variants (hoverable, clickable, selected)
 * - CardHeader with title/subtitle/action
 * - CardBody with various content
 * - CardFooter with all alignment options
 * - CardImage with aspect ratios and states
 * - Preset patterns (MediaCard, ActionCard)
 * - Interactive examples
 * - Architecture explanation
 */
export const CardPrimitivesTestPage = () => {
    const [selectedCard, setSelectedCard] = useState(null);
    const [aspectRatio, setAspectRatio] = useState('16/9');
    const [objectFit, setObjectFit] = useState('cover');

    return (
        <div className="flex flex-col gap-6 p-6">
            <PageHeader
                title="Card System - Primitive Composition"
                subtitle="Comprehensive test page for card primitives and compound component pattern"
            />

            {/* Configuration Controls */}
            <Card>
                <Card.Header title="Configuration" />
                <Card.Body>
                    <div className="flex flex-wrap gap-4">
                        <label className="flex flex-col gap-1">
                            <span className="text-sm text-secondary">Image Aspect Ratio</span>
                            <select
                                value={aspectRatio}
                                onChange={e => setAspectRatio(e.target.value)}
                                className="min-h-11 px-3 rounded-md border border-default bg-surface"
                            >
                                <option value="16/9">16:9 (Video)</option>
                                <option value="4/3">4:3 (Classic)</option>
                                <option value="1/1">1:1 (Square)</option>
                                <option value="3/2">3:2 (Photo)</option>
                            </select>
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-sm text-secondary">Image Object Fit</span>
                            <select
                                value={objectFit}
                                onChange={e => setObjectFit(e.target.value)}
                                className="min-h-11 px-3 rounded-md border border-default bg-surface"
                            >
                                <option value="cover">Cover</option>
                                <option value="contain">Contain</option>
                                <option value="fill">Fill</option>
                                <option value="none">None</option>
                            </select>
                        </label>
                    </div>
                </Card.Body>
            </Card>

            {/* Primitive Composition Pattern */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    Primitive Composition Pattern
                </h2>
                <Card>
                    <Card.Body>
                        <div className="text-sm text-secondary space-y-2">
                            <p>
                                <strong>5 Atomic Primitives:</strong>
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>
                                    <strong>CardContainer:</strong> Base wrapper with hover,
                                    clickable, selected states
                                </li>
                                <li>
                                    <strong>CardHeader:</strong> Title, subtitle, action layout
                                </li>
                                <li>
                                    <strong>CardBody:</strong> Content container with flexible
                                    layout
                                </li>
                                <li>
                                    <strong>CardFooter:</strong> Footer with alignment options
                                    (left, center, right, space-between)
                                </li>
                                <li>
                                    <strong>CardImage:</strong> Image with aspect ratio, object-fit,
                                    loading/error states
                                </li>
                            </ul>
                            <p className="pt-2">
                                <strong>Compound Component Pattern:</strong> Card.Header, Card.Body,
                                Card.Footer, Card.Image
                            </p>
                            <p>
                                <strong>Preset Patterns:</strong> MediaCard (image + metadata),
                                ActionCard (title + description + actions)
                            </p>
                        </div>
                    </Card.Body>
                </Card>
            </section>

            {/* CardContainer Primitive - State Variations */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    CardContainer Primitive (State Variations)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <Card.Header title="Standard Card" />
                        <Card.Body>
                            <p>Default card with no special states.</p>
                        </Card.Body>
                    </Card>

                    <Card hoverable>
                        <Card.Header title="Hoverable Card" />
                        <Card.Body>
                            <p>Hover to see shadow elevation effect.</p>
                        </Card.Body>
                    </Card>

                    <Card
                        clickable
                        hoverable
                        onClick={() => alert('Card clicked!')}
                        aria-label="Clickable example card"
                    >
                        <Card.Header title="Clickable Card" />
                        <Card.Body>
                            <p>Clickable with hover effect. Try clicking or pressing Enter.</p>
                        </Card.Body>
                    </Card>

                    <Card selected>
                        <Card.Header title="Selected Card" />
                        <Card.Body>
                            <p>Selected state with primary border.</p>
                        </Card.Body>
                    </Card>

                    <Card
                        clickable
                        hoverable
                        selected={selectedCard === 1}
                        onClick={() => setSelectedCard(selectedCard === 1 ? null : 1)}
                        aria-label="Selectable card 1"
                    >
                        <Card.Header title="Selectable Card 1" />
                        <Card.Body>
                            <p>Click to select/deselect. {selectedCard === 1 && '✓ Selected'}</p>
                        </Card.Body>
                    </Card>

                    <Card
                        clickable
                        hoverable
                        selected={selectedCard === 2}
                        onClick={() => setSelectedCard(selectedCard === 2 ? null : 2)}
                        aria-label="Selectable card 2"
                    >
                        <Card.Header title="Selectable Card 2" />
                        <Card.Body>
                            <p>Click to select/deselect. {selectedCard === 2 && '✓ Selected'}</p>
                        </Card.Body>
                    </Card>
                </div>
            </section>

            {/* CardHeader Primitive - Variations */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    CardHeader Primitive (Title, Subtitle, Action)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <Card.Header title="Title Only" />
                        <Card.Body>
                            <p>Header with title only.</p>
                        </Card.Body>
                    </Card>

                    <Card>
                        <Card.Header title="With Subtitle" subtitle="This is a subtitle" />
                        <Card.Body>
                            <p>Header with title and subtitle.</p>
                        </Card.Body>
                    </Card>

                    <Card>
                        <Card.Header
                            title="With Action"
                            action={
                                <IconButton
                                    icon="more_vert"
                                    variant="ghost"
                                    size="small"
                                    aria-label="More options"
                                />
                            }
                        />
                        <Card.Body>
                            <p>Header with action slot (icon button).</p>
                        </Card.Body>
                    </Card>

                    <Card>
                        <Card.Header
                            title="Complete Header"
                            subtitle="Subtitle and action together"
                            action={
                                <IconButton
                                    icon="edit"
                                    variant="primary"
                                    size="small"
                                    aria-label="Edit"
                                />
                            }
                        />
                        <Card.Body>
                            <p>Header with title, subtitle, and action.</p>
                        </Card.Body>
                    </Card>
                </div>
            </section>

            {/* CardBody Primitive - Content Variations */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    CardBody Primitive (Flexible Content)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <Card.Header title="Text Content" />
                        <Card.Body>
                            <p>
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                                eiusmod tempor incididunt ut labore et dolore magna aliqua.
                            </p>
                        </Card.Body>
                    </Card>

                    <Card>
                        <Card.Header title="List Content" />
                        <Card.Body>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>First item in list</li>
                                <li>Second item in list</li>
                                <li>Third item in list</li>
                            </ul>
                        </Card.Body>
                    </Card>

                    <Card>
                        <Card.Header title="Form Content" />
                        <Card.Body>
                            <div className="flex flex-col gap-3">
                                <input
                                    type="text"
                                    placeholder="Enter name"
                                    className="min-h-11 px-3 rounded-md border border-default bg-surface"
                                />
                                <input
                                    type="email"
                                    placeholder="Enter email"
                                    className="min-h-11 px-3 rounded-md border border-default bg-surface"
                                />
                            </div>
                        </Card.Body>
                    </Card>

                    <Card>
                        <Card.Header title="Mixed Content" />
                        <Card.Body>
                            <div className="space-y-3">
                                <p>Some text content with multiple elements.</p>
                                <div className="flex gap-2">
                                    <Button variant="primary" size="small">
                                        Button 1
                                    </Button>
                                    <Button variant="secondary" size="small">
                                        Button 2
                                    </Button>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </div>
            </section>

            {/* CardFooter Primitive - Alignment Options */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    CardFooter Primitive (Alignment Options)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <Card.Header title="Left Aligned Footer" />
                        <Card.Body>
                            <p>Actions aligned to the left.</p>
                        </Card.Body>
                        <Card.Footer align="left">
                            <Button variant="primary" size="small">
                                Primary
                            </Button>
                            <Button variant="secondary" size="small">
                                Cancel
                            </Button>
                        </Card.Footer>
                    </Card>

                    <Card>
                        <Card.Header title="Center Aligned Footer" />
                        <Card.Body>
                            <p>Actions centered.</p>
                        </Card.Body>
                        <Card.Footer align="center">
                            <Button variant="primary" size="small">
                                Confirm
                            </Button>
                        </Card.Footer>
                    </Card>

                    <Card>
                        <Card.Header title="Right Aligned Footer" />
                        <Card.Body>
                            <p>Actions aligned to the right (default).</p>
                        </Card.Body>
                        <Card.Footer align="right">
                            <Button variant="secondary" size="small">
                                Cancel
                            </Button>
                            <Button variant="primary" size="small">
                                Save
                            </Button>
                        </Card.Footer>
                    </Card>

                    <Card>
                        <Card.Header title="Space Between Footer" />
                        <Card.Body>
                            <p>Actions with space between.</p>
                        </Card.Body>
                        <Card.Footer align="space-between">
                            <Button variant="danger" size="small" icon="delete">
                                Delete
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="secondary" size="small">
                                    Cancel
                                </Button>
                                <Button variant="primary" size="small">
                                    Save
                                </Button>
                            </div>
                        </Card.Footer>
                    </Card>
                </div>
            </section>

            {/* CardImage Primitive - Aspect Ratios and States */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    CardImage Primitive (Aspect Ratios & Object Fit)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <Card.Image
                            src="https://picsum.photos/800/450"
                            alt="16:9 Example"
                            aspectRatio="16/9"
                            objectFit={objectFit}
                        />
                        <Card.Body>
                            <p className="text-sm">16:9 Aspect Ratio</p>
                        </Card.Body>
                    </Card>

                    <Card>
                        <Card.Image
                            src="https://picsum.photos/800/600"
                            alt="4:3 Example"
                            aspectRatio="4/3"
                            objectFit={objectFit}
                        />
                        <Card.Body>
                            <p className="text-sm">4:3 Aspect Ratio</p>
                        </Card.Body>
                    </Card>

                    <Card>
                        <Card.Image
                            src="https://picsum.photos/800/800"
                            alt="1:1 Example"
                            aspectRatio="1/1"
                            objectFit={objectFit}
                        />
                        <Card.Body>
                            <p className="text-sm">1:1 Aspect Ratio</p>
                        </Card.Body>
                    </Card>

                    <Card>
                        <Card.Image
                            src="https://picsum.photos/800/533"
                            alt="3:2 Example"
                            aspectRatio="3/2"
                            objectFit={objectFit}
                        />
                        <Card.Body>
                            <p className="text-sm">3:2 Aspect Ratio</p>
                        </Card.Body>
                    </Card>
                </div>
            </section>

            {/* CardImage Error State */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    CardImage Error State (Broken URL)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <Card.Image
                            src="https://invalid-url-404.jpg"
                            alt="Error Example"
                            aspectRatio={aspectRatio}
                        />
                        <Card.Body>
                            <p className="text-sm">
                                Error state displays fallback UI with icon and message.
                            </p>
                        </Card.Body>
                    </Card>
                </div>
            </section>

            {/* Compound Component Full Example */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    Compound Component Pattern (Full Example)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card hoverable>
                        <Card.Image
                            src="https://picsum.photos/800/450?random=1"
                            alt="Article thumbnail"
                            aspectRatio="16/9"
                        />
                        <Card.Header
                            title="Article Title"
                            subtitle="By John Doe • 5 min read"
                            action={
                                <IconButton
                                    icon="bookmark_border"
                                    variant="ghost"
                                    size="small"
                                    aria-label="Bookmark"
                                />
                            }
                        />
                        <Card.Body>
                            <p>
                                This demonstrates the complete compound component pattern with
                                image, header, body, and footer primitives working together.
                            </p>
                        </Card.Body>
                        <Card.Footer align="space-between">
                            <span className="text-sm text-secondary">2 hours ago</span>
                            <Button variant="primary" size="small">
                                Read More
                            </Button>
                        </Card.Footer>
                    </Card>

                    <Card hoverable>
                        <Card.Image
                            src="https://picsum.photos/800/450?random=2"
                            alt="Product image"
                            aspectRatio="16/9"
                        />
                        <Card.Header title="Product Name" subtitle="$99.99" />
                        <Card.Body>
                            <p>
                                High-quality product with excellent reviews. Free shipping on orders
                                over $50.
                            </p>
                        </Card.Body>
                        <Card.Footer align="space-between">
                            <IconButton
                                icon="favorite_border"
                                variant="ghost"
                                size="small"
                                aria-label="Add to favorites"
                            />
                            <Button variant="success" size="small" icon="shopping_cart">
                                Add to Cart
                            </Button>
                        </Card.Footer>
                    </Card>
                </div>
            </section>

            {/* Preset Pattern: MediaCard */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">MediaCard Preset Pattern</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MediaCard
                        image="https://picsum.photos/800/533?random=3"
                        title="Breaking Bad"
                        subtitle="TV Series"
                        metadata="2008-2013 • Drama • 5 Seasons"
                        onClick={() => alert('Media card clicked!')}
                        onMoreClick={() => alert('More options clicked!')}
                        selected={selectedCard === 'media1'}
                    />

                    <MediaCard
                        image="https://picsum.photos/800/533?random=4"
                        title="The Godfather"
                        subtitle="Movie"
                        metadata="1972 • Crime, Drama • 2h 55m"
                        onClick={() => setSelectedCard('media2')}
                        onMoreClick={() => alert('More options clicked!')}
                        selected={selectedCard === 'media2'}
                    />

                    <MediaCard
                        image="https://picsum.photos/800/533?random=5"
                        title="Inception"
                        subtitle="Movie"
                        metadata="2010 • Sci-Fi, Thriller • 2h 28m"
                        onClick={() => setSelectedCard('media3')}
                        selected={selectedCard === 'media3'}
                    />
                </div>
            </section>

            {/* Preset Pattern: ActionCard */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">ActionCard Preset Pattern</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ActionCard
                        title="Start Your Free Trial"
                        description="Get unlimited access to all premium features for 30 days. No credit card required."
                        actionLabel="Start Trial"
                        onAction={() => alert('Trial started!')}
                        actionVariant="success"
                        actionIcon="play_arrow"
                    />

                    <ActionCard
                        title="Upgrade to Pro"
                        description="Unlock advanced features and remove all limitations with our Pro plan."
                        actionLabel="Upgrade Now"
                        onAction={() => alert('Upgrade initiated!')}
                        actionVariant="primary"
                        actionIcon="upgrade"
                        secondaryAction={
                            <Button variant="ghost" size="medium">
                                Learn More
                            </Button>
                        }
                    />

                    <ActionCard
                        title="Delete Account"
                        description="This action cannot be undone. All your data will be permanently deleted."
                        actionLabel="Delete"
                        onAction={() => alert('Delete confirmed!')}
                        actionVariant="danger"
                        actionIcon="delete"
                        secondaryAction={
                            <Button variant="secondary" size="medium">
                                Cancel
                            </Button>
                        }
                    />

                    <ActionCard
                        title="Export Data"
                        description="Download all your data in JSON format. This may take a few minutes."
                        actionLabel="Export"
                        onAction={() => alert('Export started!')}
                        actionVariant="secondary"
                        actionIcon="download"
                    />
                </div>
            </section>

            {/* Interactive States Demo */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    Interactive States Demonstration
                </h2>
                <Card>
                    <Card.Body>
                        <div className="space-y-3">
                            <p className="text-sm text-secondary">
                                <strong>Hover States:</strong> Cards with hoverable prop show shadow
                                elevation on hover
                            </p>
                            <p className="text-sm text-secondary">
                                <strong>Click States:</strong> Clickable cards have cursor pointer
                                and can be activated with click or Enter key
                            </p>
                            <p className="text-sm text-secondary">
                                <strong>Selected States:</strong> Selected cards show primary border
                                color
                            </p>
                            <p className="text-sm text-secondary">
                                <strong>Keyboard Navigation:</strong> Tab to focus, Enter or Space
                                to activate clickable cards
                            </p>
                        </div>
                    </Card.Body>
                </Card>
            </section>

            {/* Architecture Documentation */}
            <Card>
                <Card.Header title="Architecture Documentation" />
                <Card.Body>
                    <div className="text-sm text-secondary space-y-2">
                        <p>
                            <strong>Primitive Composition:</strong> Every card is built by
                            composing:
                        </p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>CardContainer primitive (base wrapper with states)</li>
                            <li>CardImage primitive (aspect ratio, object-fit, loading/error)</li>
                            <li>CardHeader primitive (title, subtitle, action slot)</li>
                            <li>CardBody primitive (flexible content container)</li>
                            <li>CardFooter primitive (action buttons with alignment)</li>
                        </ul>
                        <p className="pt-2">
                            <strong>Compound Component Pattern:</strong> Card.Image, Card.Header,
                            Card.Body, Card.Footer
                        </p>
                        <p>
                            <strong>Zero Duplication:</strong> All card logic exists only in
                            primitives
                        </p>
                        <p>
                            <strong>Preset Patterns:</strong> MediaCard (image + metadata +
                            actions), ActionCard (title + description + primary action)
                        </p>
                        <p>
                            <strong>Fully Reusable:</strong> Primitives can be used anywhere, not
                            just in Card context
                        </p>
                        <p className="pt-2">
                            <strong>Accessibility:</strong> WCAG 2.1 AA compliant - keyboard
                            navigation, ARIA labels, semantic HTML, focus indicators
                        </p>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default CardPrimitivesTestPage;
